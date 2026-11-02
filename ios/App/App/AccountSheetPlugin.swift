import Foundation
import Capacitor
import SwiftUI
import StoreKit
import UIKit

/// Bridge for components/account/native-account-sheet.tsx: on iPhone, Manage
/// Account is a native SwiftUI sheet (AccountSheetView) instead of a web one.
/// It gets Liquid Glass on iOS 26 and the screen's full refresh rate, which the
/// web view caps at 60 fps. The web side keeps every rule: it sends the sheet
/// its state (`present`, then `update` whenever something changes) and hears
/// back what was tapped as "action" events. Registered in
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
    /// An invisible stand-in over the web button the sheet opens out of.
    private var anchor: UIView?
    /// The page behind the sheet, blurred and dimmed as the web sheet's
    /// backdrop does it (bg-black/50 backdrop-blur-md).
    private var backdrop: UIVisualEffectView?
    private var backdropDim: UIView?
    private static let backdropBlur = UIBlurEffect(style: .systemUltraThinMaterialDark)

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
            if let model = self.model, self.sheet != nil {
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
            if let model = self.model {
                model.addImages(images)
                if model.state != state { model.state = state }
                if let sheet = self.sheet {
                    Self.applyStyle(dark: state.dark, to: sheet)
                }
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
        model.onClose = { [weak self] in self?.close(notify: true) }
        model.onManageSubscriptions = { [weak self] in self?.manageSubscriptions() }

        let controller = AccountSheetController(rootView: AccountSheetView(model: model))
        controller.modalPresentationStyle = .pageSheet
        if let sheet = controller.sheetPresentationController {
            // Short of full height, so iOS 26 draws it as floating glass, and
            // one height only: the sheet never resizes once it's open.
            sheet.detents = [.custom(identifier: .init("account")) { context in
                context.maximumDetentValue * 0.9
            }]
            // The sheet draws the web sheet's own handle, and its corners.
            sheet.prefersGrabberVisible = false
            sheet.preferredCornerRadius = sheetCornerRadius
        }
        Self.applyStyle(dark: state.dark, to: controller)
        controller.presentationController?.delegate = self

        // Out of the button it was opened from, as the web sheet does.
        if let source, #available(iOS 26.0, *) {
            let rect = host.view.convert(source, from: bridge?.webView)
            let anchor = UIView(frame: rect)
            anchor.isUserInteractionEnabled = false
            anchor.backgroundColor = .clear
            host.view.addSubview(anchor)
            self.anchor = anchor
            controller.preferredTransition = .zoom { _ in anchor }
        }

        // The web sheet's backdrop: the page blurred and dimmed behind it,
        // fading in with the sheet.
        let backdrop = UIVisualEffectView(effect: nil)
        backdrop.frame = host.view.bounds
        backdrop.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        backdrop.isUserInteractionEnabled = false
        let dim = UIView(frame: backdrop.bounds)
        dim.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        dim.backgroundColor = UIColor.black.withAlphaComponent(0.3)
        dim.alpha = 0
        backdrop.contentView.addSubview(dim)
        host.view.addSubview(backdrop)
        self.backdrop = backdrop
        self.backdropDim = dim

        self.model = model
        self.sheet = controller
        host.present(controller, animated: true)
        alongside(controller) { self.setBackdrop(shown: true) }
    }

    private func setBackdrop(shown: Bool) {
        backdrop?.effect = shown ? Self.backdropBlur : nil
        backdropDim?.alpha = shown ? 1 : 0
    }

    /// Runs `change` in step with the sheet's opening or closing.
    private func alongside(_ controller: UIViewController, _ change: @escaping () -> Void) {
        if let coordinator = controller.transitionCoordinator {
            coordinator.animate(alongsideTransition: { _ in change() })
        } else {
            UIView.animate(withDuration: 0.35, animations: change)
        }
    }

    /// Dark or light for the sheet's content and, from iOS 17, for the sheet's
    /// own glass too, which otherwise follows the system setting.
    private static func applyStyle(dark: Bool, to controller: UIViewController) {
        let style: UIUserInterfaceStyle = dark ? .dark : .light
        controller.overrideUserInterfaceStyle = style
        if #available(iOS 17.0, *) {
            controller.sheetPresentationController?.traitOverrides.userInterfaceStyle = style
        }
    }

    private func close(notify: Bool) {
        guard let sheet else {
            finish(notify: notify)
            return
        }
        sheet.dismiss(animated: true) { [weak self] in
            self?.finish(notify: notify)
        }
        alongside(sheet) { self.setBackdrop(shown: false) }
    }

    private func finish(notify: Bool) {
        guard model != nil else { return }
        model = nil
        sheet = nil
        anchor?.removeFromSuperview()
        anchor = nil
        backdrop?.removeFromSuperview()
        backdrop = nil
        backdropDim = nil
        if notify {
            notifyListeners("action", data: ["type": "closed"])
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
    /// sheet with made-up state (-SprindAccountDemoLevel picks the level),
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
            // -SprindAccountDemoSlow: every UIKit animation at a tenth of its
            // speed, so screenshots can catch the sheet opening.
            if args.contains("-SprindAccountDemoSlow") {
                self.bridge?.viewController?.view.window?.layer.speed = 0.1
            }
            let size = self.bridge?.viewController?.view.bounds.size ?? CGSize(width: 400, height: 800)
            let button = CGRect(x: size.width - 64, y: 60, width: 44, height: 44)
            self.show(state: .demo(level: level), focus: nil, source: button)
        }
    }
    #endif
}

extension AccountSheetPlugin: UIAdaptivePresentationControllerDelegate {
    /// Being swiped down: the backdrop clears with the sheet, and comes back
    /// if the swipe is let go of.
    public func presentationControllerWillDismiss(_ presentationController: UIPresentationController) {
        guard let coordinator = presentationController.presentedViewController.transitionCoordinator else { return }
        coordinator.animate(alongsideTransition: { _ in
            self.setBackdrop(shown: false)
        }, completion: { context in
            if context.isCancelled { self.setBackdrop(shown: true) }
        })
    }

    /// Swiped down: tell the web side, which keeps its own open/closed state.
    public func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
        finish(notify: true)
    }
}

final class AccountSheetController: UIHostingController<AccountSheetView> {
    override func viewDidLoad() {
        super.viewDidLoad()
        // Clear, so the sheet's own glass (iOS 26) or the view's material shows.
        view.backgroundColor = .clear
    }
}
