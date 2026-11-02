import Foundation
import Capacitor
import SwiftUI
import StoreKit
import UIKit
import WebKit
import CoreImage

/// Bridge for components/account/native-account-sheet.tsx: on iPhone, Manage
/// Account is a native SwiftUI sheet instead of a web one, drawn exactly as the
/// web sheet is (AccountSheetHost) but at the screen's full refresh rate, which
/// the web view caps at 60 fps. The web side keeps every rule: it sends the
/// sheet its state (`present`, then `update` whenever something changes) and
/// hears back what was tapped as "action" events. Registered in
/// ViewController.capacitorDidLoad.
@objc(AccountSheetPlugin)
public class AccountSheetPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AccountSheetPlugin"
    public let jsName = "AccountSheet"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "present", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "dismiss", returnType: CAPPluginReturnPromise),
    ]

    private var model: AccountSheetModel?
    private weak var sheet: UIViewController?
    /// Whether the web side still needs telling when the sheet has gone: not
    /// when it asked for the close itself.
    private var notifyOnFinish = true
    private var glassRefresh: DispatchWorkItem?

    @objc func present(_ call: CAPPluginCall) {
        let state: AccountState
        do {
            state = try Self.decode(call)
        } catch {
            call.reject("Invalid account state: \(error)")
            return
        }
        let images = Self.images(call)
        let focus = call.getString("focus")
        var source: CGRect?
        if let x = call.getDouble("sourceX"), let y = call.getDouble("sourceY"),
           let width = call.getDouble("sourceWidth"), let height = call.getDouble("sourceHeight"),
           width > 0, height > 0 {
            source = CGRect(x: x, y: y, width: width, height: height)
        }
        DispatchQueue.main.async {
            if let model = self.model {
                model.addImages(images)
                model.state = state
            } else {
                self.show(state: state, images: images, focus: focus, source: source)
            }
            call.resolve()
        }
    }

    @objc func update(_ call: CAPPluginCall) {
        let state: AccountState
        do {
            state = try Self.decode(call)
        } catch {
            call.reject("Invalid account state: \(error)")
            return
        }
        let images = Self.images(call)
        DispatchQueue.main.async {
            guard let model = self.model else {
                call.resolve()
                return
            }
            model.addImages(images)
            let themeChanged = model.state.theme.current != state.theme.current || model.state.dark != state.dark
            if model.state != state { model.state = state }
            self.sheet?.overrideUserInterfaceStyle = state.dark ? .dark : .light
            // A new theme restyles the page behind: once its backdrop has
            // cross-faded, the glass is made again from it.
            if themeChanged { self.refreshGlass(after: 0.7) }
            call.resolve()
        }
    }

    @objc func dismiss(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            // The web side asked, so it already knows: no "closed" back.
            self.close(notify: false)
            call.resolve()
        }
    }

    private static func decode(_ call: CAPPluginCall) throws -> AccountState {
        guard let json = call.getString("state") else {
            throw DecodingError.dataCorrupted(.init(codingPath: [], debugDescription: "state is missing"))
        }
        return try JSONDecoder().decode(AccountState.self, from: Data(json.utf8))
    }

    /// Pictures sent alongside the state, as data URLs by name.
    private static func images(_ call: CAPPluginCall) -> [String: String] {
        guard let object = call.getObject("images") else { return [:] }
        var links: [String: String] = [:]
        for (key, value) in object {
            if let link = value as? String { links[key] = link }
        }
        return links
    }

    func show(state: AccountState, images: [String: String] = [:], focus: String?, source: CGRect?) {
        guard let host = bridge?.viewController else { return }

        let model = AccountSheetModel(state: state, focus: focus)
        model.addImages(images)
        model.onAction = { [weak self] type, value in
            var data: [String: Any] = ["type": type]
            if let value { data["value"] = value }
            self?.notifyListeners("action", data: data)
        }
        model.onManageSubscriptions = { [weak self] in self?.manageSubscriptions() }
        model.onFinished = { [weak self] in self?.finish() }
        self.model = model
        notifyOnFinish = true

        // The page behind becomes the sheet's glass first, then the sheet
        // opens over it (a snapshot and two blurs: a few hundredths of a second).
        makeGlass { [weak self] glass in
            guard let self, self.model === model else { return }
            model.glass = glass
            let rootView = AccountSheetHost(model: model, source: source)
            let controller = AccountSheetController(rootView: rootView)
            controller.modalPresentationStyle = .overFullScreen
            controller.overrideUserInterfaceStyle = state.dark ? .dark : .light
            self.sheet = controller
            // The host animates itself in; UIKit only puts it on screen.
            host.present(controller, animated: false)
        }
    }

    /// Asks the open sheet to animate away; finish() runs when it has.
    private func close(notify: Bool) {
        guard let model else { return }
        if !notify { notifyOnFinish = false }
        if sheet == nil {
            finish()
        } else {
            model.close()
        }
    }

    private func finish() {
        guard model != nil else { return }
        let notify = notifyOnFinish
        glassRefresh?.cancel()
        sheet?.dismiss(animated: false)
        model = nil
        sheet = nil
        notifyOnFinish = true
        if notify {
            notifyListeners("action", data: ["type": "closed"])
        }
    }

    // ── The glass ────────────────────────────────────────────────────────────

    /// Snapshots the page and works out, as the web sheet's CSS does, what its
    /// backdrop and its glass show. Nil with Reduce Transparency on (the web
    /// sheet goes solid then too) or if the snapshot fails.
    private func makeGlass(_ done: @escaping (SheetGlass?) -> Void) {
        guard !UIAccessibility.isReduceTransparencyEnabled, let webView = bridge?.webView else {
            done(nil)
            return
        }
        let config = WKSnapshotConfiguration()
        config.afterScreenUpdates = false
        webView.takeSnapshot(with: config) { image, _ in
            guard let image, let page = image.cgImage else {
                done(nil)
                return
            }
            let scale = image.scale
            DispatchQueue.global(qos: .userInitiated).async {
                let glass = SheetGlass.make(from: page, scale: scale)
                DispatchQueue.main.async { done(glass) }
            }
        }
    }

    private func refreshGlass(after delay: TimeInterval) {
        glassRefresh?.cancel()
        let work = DispatchWorkItem { [weak self] in
            self?.makeGlass { glass in
                guard let glass, let model = self?.model else { return }
                withAnimation(.easeInOut(duration: 0.4)) { model.glass = glass }
            }
        }
        glassRefresh = work
        DispatchQueue.main.asyncAfter(deadline: .now() + delay, execute: work)
    }

    /// Apple's own subscription sheet, over this one; the App Store page if
    /// that isn't available.
    private func manageSubscriptions() {
        Task { @MainActor in
            if let scene = self.bridge?.viewController?.view.window?.windowScene {
                do {
                    try await AppStore.showManageSubscriptions(in: scene)
                    return
                } catch {}
            }
            if let url = URL(string: "itms-apps://apps.apple.com/account/subscriptions") {
                _ = await UIApplication.shared.open(url)
            }
        }
    }

    #if DEBUG
    /// For the CI check's simulator screenshots: -SprindAccountDemo opens the
    /// sheet with made-up state (-SprindAccountDemoLevel picks the level,
    /// -SprindAccountDemoSlow plays its opening ten times slower),
    /// -SprindBorderGallery shows every border.
    func runDemoIfAsked() {
        let args = ProcessInfo.processInfo.arguments
        if args.contains("-SprindBorderGallery") {
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                let gallery = UIHostingController(rootView: BorderGalleryView())
                gallery.modalPresentationStyle = .fullScreen
                self.bridge?.viewController?.present(gallery, animated: false)
            }
            return
        }
        guard args.contains("-SprindAccountDemo") else { return }
        var level = 57
        if let index = args.firstIndex(of: "-SprindAccountDemoLevel"), index + 1 < args.count,
           let asked = Int(args[index + 1]) {
            level = asked
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            AccountSheetModel.slowMotion = args.contains("-SprindAccountDemoSlow")
            let size = self.bridge?.viewController?.view.bounds.size ?? CGSize(width: 400, height: 800)
            let button = CGRect(x: size.width - 64, y: 60, width: 44, height: 44)
            self.show(state: .demo(level: level), focus: nil, source: button)
        }
    }
    #endif
}

/// What the web sheet's CSS makes of the page behind it: the backdrop
/// (bg-black/50 over a 6 px blur) and the glass (a further blur(12px)
/// saturate(1.2) of that). The white wash, sheen and rim go on top
/// (AccountSheetHost). Made from a snapshot at one pixel per point: it is
/// blurred anyway.
struct SheetGlass {
    let backdrop: UIImage
    let sheet: UIImage

    static func make(from page: CGImage, scale: CGFloat) -> SheetGlass? {
        let context = CIContext()
        let input = CIImage(cgImage: page).transformed(by: CGAffineTransform(scaleX: 1 / scale, y: 1 / scale))
        let extent = input.extent
        let half = input.applyingFilter("CIColorMatrix", parameters: [
            "inputRVector": CIVector(x: 0.5, y: 0, z: 0, w: 0),
            "inputGVector": CIVector(x: 0, y: 0.5, z: 0, w: 0),
            "inputBVector": CIVector(x: 0, y: 0, z: 0.5, w: 0),
            "inputAVector": CIVector(x: 0, y: 0, z: 0, w: 1),
        ])
        let backdrop = half.clampedToExtent().applyingGaussianBlur(sigma: 6)
        let glass = backdrop
            .applyingGaussianBlur(sigma: 12)
            .applyingFilter("CIColorControls", parameters: [kCIInputSaturationKey: 1.2])
        guard let backdropImage = context.createCGImage(backdrop.cropped(to: extent), from: extent),
              let glassImage = context.createCGImage(glass.cropped(to: extent), from: extent) else { return nil }
        return SheetGlass(
            backdrop: UIImage(cgImage: backdropImage, scale: 1, orientation: .up),
            sheet: UIImage(cgImage: glassImage, scale: 1, orientation: .up)
        )
    }
}

final class AccountSheetController: UIHostingController<AccountSheetHost> {
    override func viewDidLoad() {
        super.viewDidLoad()
        // Clear: the page shows round the sheet until the backdrop fades in.
        view.backgroundColor = .clear
    }
}
