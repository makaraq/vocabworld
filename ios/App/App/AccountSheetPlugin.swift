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

    @objc func present(_ call: CAPPluginCall) {
        let state: AccountState
        do {
            state = try Self.decode(call)
        } catch {
            call.reject("Invalid account state: \(error)")
            return
        }
        let focus = call.getString("focus")
        var source: CGRect?
        if let x = call.getDouble("sourceX"), let y = call.getDouble("sourceY"),
           let width = call.getDouble("sourceWidth"), let height = call.getDouble("sourceHeight"),
           width > 0, height > 0 {
            source = CGRect(x: x, y: y, width: width, height: height)
        }
        DispatchQueue.main.async {
            if let model = self.model, self.sheet != nil {
                model.state = state
            } else {
                self.show(state: state, focus: focus, source: source)
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
        DispatchQueue.main.async {
            if let model = self.model {
                if model.state != state { model.state = state }
                self.sheet?.overrideUserInterfaceStyle = state.dark ? .dark : .light
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

    func show(state: AccountState, focus: String?, source: CGRect?) {
        guard let host = bridge?.viewController else { return }

        let model = AccountSheetModel(state: state, focus: focus)
        model.onAction = { [weak self] type, value in
            var data: [String: Any] = ["type": type]
            if let value { data["value"] = value }
            self?.notifyListeners("action", data: data)
        }
        model.onClose = { [weak self] in self?.close(notify: true) }
        model.onManageSubscriptions = { [weak self] in self?.manageSubscriptions() }

        let controller = AccountSheetController(rootView: AccountSheetView(model: model))
        controller.overrideUserInterfaceStyle = state.dark ? .dark : .light
        controller.modalPresentationStyle = .pageSheet
        if let sheet = controller.sheetPresentationController {
            // Short of full height, so iOS 26 draws it as floating glass, and
            // one height only: the sheet never resizes once it's open.
            sheet.detents = [.custom(identifier: .init("account")) { context in
                context.maximumDetentValue * 0.9
            }]
            sheet.prefersGrabberVisible = true
        }
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

        self.model = model
        self.sheet = controller
        host.present(controller, animated: true)
    }

    private func close(notify: Bool) {
        guard let sheet else {
            finish(notify: notify)
            return
        }
        sheet.dismiss(animated: true) { [weak self] in
            self?.finish(notify: notify)
        }
    }

    private func finish(notify: Bool) {
        guard model != nil else { return }
        model = nil
        sheet = nil
        anchor?.removeFromSuperview()
        anchor = nil
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
            let size = self.bridge?.viewController?.view.bounds.size ?? CGSize(width: 400, height: 800)
            let button = CGRect(x: size.width - 64, y: 60, width: 44, height: 44)
            self.show(state: .demo(level: level), focus: nil, source: button)
        }
    }
    #endif
}

extension AccountSheetPlugin: UIAdaptivePresentationControllerDelegate {
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
