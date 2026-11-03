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
    private var glassRefreshes: [DispatchWorkItem] = []
    /// Counts the glass refreshes asked for, and the newest one on screen.
    private var glassRequests = 0
    private var glassShown = 0
    /// The theme the glass was last made under. (The sheet marks a tapped
    /// theme as chosen at once, so the state alone can't show it changed.)
    private var glassTheme = ""
    /// The button the sheet opened from, pictured along with the glass.
    private var source: CGRect?

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
            if model.state != state { model.state = state }
            self.sheet?.overrideUserInterfaceStyle = state.dark ? .dark : .light
            // A new theme restyles the page behind, which shows through live;
            // the glass follows the page's 700 ms cross-fade, made again from it
            // every tenth of a second until it has settled.
            let theme = Self.themeKey(state)
            if theme != self.glassTheme {
                self.glassTheme = theme
                self.refreshGlass(after: stride(from: 0.05, through: 1.05, by: 0.1).map { $0 })
            }
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
        self.source = source
        notifyOnFinish = true
        glassTheme = Self.themeKey(state)

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

    private static func themeKey(_ state: AccountState) -> String {
        "\(state.theme.current)|\(state.dark)"
    }

    private func finish() {
        guard model != nil else { return }
        let notify = notifyOnFinish
        glassRefreshes.forEach { $0.cancel() }
        glassRefreshes = []
        sheet?.dismiss(animated: false)
        model = nil
        sheet = nil
        source = nil
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
        // WebKit's own snapshot of the page as painted (with the sheet up it
        // still shows just the page, as a theme change needs). It comes in the
        // screen's wide colour, so it is turned into plain sRGB first.
        let config = WKSnapshotConfiguration()
        config.afterScreenUpdates = true
        let source = self.source
        webView.takeSnapshot(with: config) { image, _ in
            let page = image?.cgImage.flatMap { Self.plainSRGB($0, width: webView.bounds.width, height: webView.bounds.height) }
            // The button it opens from, as sharp as the screen shows it.
            let button = source.flatMap { rect in
                image?.cgImage.flatMap { Self.crop($0, to: rect, pointsWide: webView.bounds.width) }
            }
            DispatchQueue.global(qos: .userInitiated).async {
                let glass = page.flatMap { Self.looksBlank($0) ? nil : SheetGlass.make(from: $0, scale: 1, button: button) }
                #if DEBUG
                if let page { Self.saveForDemo(page: page, glass: glass) }
                #endif
                DispatchQueue.main.async { done(glass) }
            }
        }
    }

    /// An image redrawn as plain 8-bit sRGB, the values the web's CSS works
    /// in, at one pixel per point (it is blurred anyway). Also the pop-ups'
    /// backdrops (PanelBackdrop).
    static func plainSRGB(_ image: CGImage, width: CGFloat, height: CGFloat) -> CGImage? {
        let w = max(1, Int(width.rounded())), h = max(1, Int(height.rounded()))
        guard let space = CGColorSpace(name: CGColorSpace.sRGB),
              let context = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0, space: space,
                                      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return nil }
        context.interpolationQuality = .medium
        context.draw(image, in: CGRect(x: 0, y: 0, width: w, height: h))
        return context.makeImage()
    }

    /// Part of a picture of the screen (`pointsWide` across), at its full sharpness.
    private static func crop(_ image: CGImage, to rect: CGRect, pointsWide: CGFloat) -> UIImage? {
        let scale = CGFloat(image.width) / max(pointsWide, 1)
        let pixels = CGRect(x: rect.minX * scale, y: rect.minY * scale,
                            width: rect.width * scale, height: rect.height * scale).integral
        guard let part = image.cropping(to: pixels) else { return nil }
        return UIImage(cgImage: part, scale: scale, orientation: .up)
    }

    /// One colour all over: nothing was drawn.
    private static func looksBlank(_ image: CGImage) -> Bool {
        let side = 8
        var pixels = [UInt8](repeating: 0, count: side * side * 4)
        return pixels.withUnsafeMutableBytes { buffer -> Bool in
            guard let context = CGContext(data: buffer.baseAddress, width: side, height: side, bitsPerComponent: 8,
                                          bytesPerRow: side * 4, space: CGColorSpaceCreateDeviceRGB(),
                                          bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return true }
            context.draw(image, in: CGRect(x: 0, y: 0, width: side, height: side))
            let bytes = buffer.bindMemory(to: UInt8.self)
            for i in stride(from: 4, to: bytes.count, by: 4) {
                for c in 0..<3 where abs(Int(bytes[i + c]) - Int(bytes[c])) > 2 { return false }
            }
            return true
        }
    }

    #if DEBUG
    /// Where the demo keeps what the glass was made from (-SprindAccountDemoFrames).
    static var demoFolder: URL?

    private static func saveForDemo(page: CGImage, glass: SheetGlass?) {
        guard let folder = demoFolder else { return }
        try? UIImage(cgImage: page).pngData()?.write(to: folder.appendingPathComponent("glass-page.png"))
        try? glass?.sheet.pngData()?.write(to: folder.appendingPathComponent("glass-sheet.png"))
    }
    #endif

    private func refreshGlass(after delays: [TimeInterval]) {
        glassRefreshes.forEach { $0.cancel() }
        glassRefreshes = delays.map { delay in
            let work = DispatchWorkItem { [weak self] in
                guard let self else { return }
                self.glassRequests += 1
                let request = self.glassRequests
                self.makeGlass { glass in
                    // Only ever forward: a slow picture never replaces a newer one.
                    guard let glass, let model = self.model, request > self.glassShown else { return }
                    self.glassShown = request
                    withAnimation(.linear(duration: 0.12)) { model.glass = glass }
                }
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + delay, execute: work)
            return work
        }
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
    /// -SprindAccountDemoFrames records its opening as pictures in
    /// Documents/frames), -SprindBorderGallery shows every border.
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
        // Once the page has painted, as it long has when someone opens the
        // sheet: the glass is made from it. A cold launch in the CI simulator
        // can take over 3.5 s to paint it.
        DispatchQueue.main.asyncAfter(deadline: .now() + 9) {
            let recording = args.contains("-SprindAccountDemoFrames")
            if recording, let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first {
                let folder = documents.appendingPathComponent("frames")
                try? FileManager.default.removeItem(at: folder)
                try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
                Self.demoFolder = folder
            }
            let size = self.bridge?.viewController?.view.bounds.size ?? CGSize(width: 400, height: 800)
            let button = CGRect(x: size.width - 64, y: 60, width: 44, height: 44)
            self.show(state: .demo(level: level), focus: nil, source: button)
            if recording {
                self.model?.onAppear = { [weak self] in self?.recordFrames() }
            }
        }
    }

    /// Pictures of the screen every 40 ms for the first 0.8 s of the opening,
    /// a third of full size, for the CI check to see the morph.
    private func recordFrames() {
        guard let window = bridge?.viewController?.view.window, let folder = Self.demoFolder else { return }
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        var count = 0
        Timer.scheduledTimer(withTimeInterval: 0.04, repeats: true) { timer in
            let image = UIGraphicsImageRenderer(bounds: window.bounds, format: format).image { _ in
                _ = window.drawHierarchy(in: window.bounds, afterScreenUpdates: false)
            }
            let name = String(format: "frame-%02d.png", count)
            try? image.pngData()?.write(to: folder.appendingPathComponent(name))
            count += 1
            if count >= 20 { timer.invalidate() }
        }
    }
    #endif
}

/// What the web sheet's glass shows of the page behind it, by its CSS: the
/// backdrop's bg-black/50 over a 6 px blur, then the sheet's own blur(12px)
/// saturate(1.2) (one 13.4 px blur, as two blurs add up). The white wash,
/// sheen and rim go on top, and the backdrop itself is drawn live
/// (AccountSheetHost). Made from a snapshot at one pixel per point: it is
/// blurred anyway.
struct SheetGlass {
    let sheet: UIImage
    /// The button the sheet opens from, as pictured with the page.
    let button: UIImage?

    static func make(from page: CGImage, scale: CGFloat, button: UIImage?) -> SheetGlass? {
        // Browsers composite and filter CSS in plain sRGB values, not linear
        // light: work in the snapshot's own values so 50% black means half.
        let context = CIContext(options: [.workingColorSpace: NSNull()])
        let space = CGColorSpace(name: CGColorSpace.sRGB)!
        let input = CIImage(cgImage: page).transformed(by: CGAffineTransform(scaleX: 1 / scale, y: 1 / scale))
        let extent = input.extent
        let glass = input
            .applyingFilter("CIColorMatrix", parameters: [
                "inputRVector": CIVector(x: 0.5, y: 0, z: 0, w: 0),
                "inputGVector": CIVector(x: 0, y: 0.5, z: 0, w: 0),
                "inputBVector": CIVector(x: 0, y: 0, z: 0.5, w: 0),
                "inputAVector": CIVector(x: 0, y: 0, z: 0, w: 1),
            ])
            .clampedToExtent()
            .applyingGaussianBlur(sigma: (6.0 * 6.0 + 12.0 * 12.0).squareRoot())
            .applyingFilter("CIColorControls", parameters: [kCIInputSaturationKey: 1.2])
        guard let image = context.createCGImage(glass.cropped(to: extent), from: extent, format: .RGBA8, colorSpace: space)
        else { return nil }
        return SheetGlass(sheet: UIImage(cgImage: image, scale: 1, orientation: .up), button: button)
    }
}

final class AccountSheetController: UIHostingController<AccountSheetHost> {
    override func viewDidLoad() {
        super.viewDidLoad()
        // Clear: the page shows round the sheet until the backdrop fades in.
        view.backgroundColor = .clear
    }
}
