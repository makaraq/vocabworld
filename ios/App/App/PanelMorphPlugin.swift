import Foundation
import Capacitor
import SwiftUI
import UIKit
import WebKit

/// Bridge for lib/native/panel-morph.ts: the motion of a web pop-up opening
/// out of its button and closing back into it, drawn natively at the screen's
/// full refresh rate (the web view stops at 60 fps). The pop-up itself stays
/// the web one. `freeze` covers the screen with a picture of it; the web side
/// then puts the pop-up at rest underneath, and `open` takes a second picture
/// and grows the pop-up's glass out of the button between the two, as the
/// native account sheet opens (AccountSheetHost), before stepping aside onto
/// the identical live pop-up. `close` and `slide` run it the other way.
/// Registered in ViewController.capacitorDidLoad.
@objc(PanelMorphPlugin)
public class PanelMorphPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PanelMorphPlugin"
    public let jsName = "PanelMorph"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "freeze", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "open", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "close", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "slide", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clear", returnType: CAPPluginReturnPromise),
    ]

    /// What covers the web view now: the frozen picture, or the morph.
    private var overlay: UIView?
    private var overlayController: UIViewController?
    /// The picture under the frozen cover.
    private var frozen: UIImage?

    @objc func freeze(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.snapshot { image in
                guard let image else {
                    call.reject("Could not picture the screen")
                    return
                }
                self.frozen = image
                let cover = UIImageView(image: image)
                cover.contentMode = .scaleToFill
                self.cover(with: cover, controller: nil)
                call.resolve()
            }
        }
    }

    @objc func open(_ call: CAPPluginCall) {
        run(call, kind: .open)
    }

    @objc func close(_ call: CAPPluginCall) {
        run(call, kind: .close)
    }

    @objc func slide(_ call: CAPPluginCall) {
        run(call, kind: .slide)
    }

    @objc func clear(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.uncover()
            call.resolve()
        }
    }

    private func run(_ call: CAPPluginCall, kind: PanelMorphKind) {
        guard let from = Self.rect(call, "from") else {
            call.reject("from is required")
            return
        }
        let to = Self.rect(call, "to")
        let fromRadius = CGFloat(call.getDouble("fromRadius") ?? 16)
        let toRadius = CGFloat(call.getDouble("toRadius") ?? 16)
        let velocity = CGFloat(call.getDouble("velocity") ?? 0)
        DispatchQueue.main.async {
            guard let before = self.frozen else {
                self.uncover()
                call.resolve()
                return
            }
            self.snapshot { after in
                guard let after else {
                    self.uncover()
                    call.resolve()
                    return
                }
                // Opening, the frozen picture is the screen without the pop-up
                // and the new one has it; closing, the other way round.
                let opening = kind == .open
                let view = PanelMorphView(
                    kind: kind,
                    withPanel: opening ? after : before,
                    withoutPanel: opening ? before : after,
                    panel: opening ? (to ?? from) : from,
                    button: opening ? from : (to ?? from),
                    panelRadius: opening ? toRadius : fromRadius,
                    buttonRadius: opening ? fromRadius : toRadius,
                    velocity: velocity
                ) { [weak self] in
                    self?.uncover()
                    call.resolve()
                }
                let controller = UIHostingController(rootView: view)
                controller.view.backgroundColor = .clear
                self.cover(with: controller.view, controller: controller)
            }
        }
    }

    /// The web view's own picture of the page as painted: just the page, with
    /// nothing native on it.
    private func snapshot(_ done: @escaping (UIImage?) -> Void) {
        guard let webView = bridge?.webView else {
            done(nil)
            return
        }
        let config = WKSnapshotConfiguration()
        config.afterScreenUpdates = true
        webView.takeSnapshot(with: config) { image, _ in done(image) }
    }

    /// Puts `view` over the web view, then takes away what was there before,
    /// so nothing flickers between them. It takes the touches meanwhile.
    private func cover(with view: UIView, controller: UIViewController?) {
        guard let host = bridge?.viewController else { return }
        view.frame = host.view.bounds
        view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.isUserInteractionEnabled = true
        if let controller {
            host.addChild(controller)
            host.view.addSubview(view)
            controller.didMove(toParent: host)
        } else {
            host.view.addSubview(view)
        }
        let previous = overlay
        let previousController = overlayController
        overlay = view
        overlayController = controller
        remove(previous, previousController)
    }

    private func uncover() {
        remove(overlay, overlayController)
        overlay = nil
        overlayController = nil
        frozen = nil
    }

    private func remove(_ view: UIView?, _ controller: UIViewController?) {
        controller?.willMove(toParent: nil)
        view?.removeFromSuperview()
        controller?.removeFromParent()
    }

    #if DEBUG
    /// For the CI check: -SprindMorphDemo opens the test page's pop-up
    /// (window.__morphTest, in the workflow's stand-in page) and records the
    /// screen every 40 ms into Documents/morph.
    func runDemoIfAsked() {
        guard ProcessInfo.processInfo.arguments.contains("-SprindMorphDemo") else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + 9) {
            guard let window = self.bridge?.viewController?.view.window,
                  let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else { return }
            let folder = documents.appendingPathComponent("morph")
            try? FileManager.default.removeItem(at: folder)
            try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
            self.bridge?.webView?.evaluateJavaScript("window.__morphTest && window.__morphTest()", completionHandler: nil)
            let format = UIGraphicsImageRendererFormat()
            format.scale = 1
            var count = 0
            Timer.scheduledTimer(withTimeInterval: 0.04, repeats: true) { timer in
                let image = UIGraphicsImageRenderer(bounds: window.bounds, format: format).image { _ in
                    _ = window.drawHierarchy(in: window.bounds, afterScreenUpdates: false)
                }
                try? image.pngData()?.write(to: folder.appendingPathComponent(String(format: "frame-%02d.png", count)))
                count += 1
                if count >= 25 { timer.invalidate() }
            }
        }
    }
    #endif

    private static func rect(_ call: CAPPluginCall, _ key: String) -> CGRect? {
        guard let object = call.getObject(key),
              let x = (object["x"] as? NSNumber)?.doubleValue,
              let y = (object["y"] as? NSNumber)?.doubleValue,
              let width = (object["width"] as? NSNumber)?.doubleValue,
              let height = (object["height"] as? NSNumber)?.doubleValue,
              width > 0, height > 0 else { return nil }
        return CGRect(x: x, y: y, width: width, height: height)
    }
}

enum PanelMorphKind {
    case open, close, slide
}

/// The morph itself, between two pictures of the screen: the page without the
/// pop-up, darkening as the backdrop comes in, and the page with it, seen
/// through the pop-up's glass as it grows out of the button (or shrinks back
/// into it, or slides away down). Its contents stay still meanwhile, as the
/// web morph keeps them (lib/morph-modal.ts).
struct PanelMorphView: View {
    let kind: PanelMorphKind
    let withPanel: UIImage
    let withoutPanel: UIImage
    let panel: CGRect
    let button: CGRect
    let panelRadius: CGFloat
    let buttonRadius: CGFloat
    /// The drag's speed at release, in points per millisecond (sliding away).
    let velocity: CGFloat
    let finished: () -> Void

    /// Whether the pop-up is out (open) or in (closed, or slid away).
    @State private var out: Bool

    init(kind: PanelMorphKind, withPanel: UIImage, withoutPanel: UIImage, panel: CGRect, button: CGRect,
         panelRadius: CGFloat, buttonRadius: CGFloat, velocity: CGFloat, finished: @escaping () -> Void) {
        self.kind = kind
        self.withPanel = withPanel
        self.withoutPanel = withoutPanel
        self.panel = panel
        self.button = button
        self.panelRadius = panelRadius
        self.buttonRadius = buttonRadius
        self.velocity = velocity
        self.finished = finished
        _out = State(initialValue: kind != .open)
    }

    var body: some View {
        GeometryReader { geo in
            let screen = geo.size
            let shown: CGFloat = out ? 1 : 0
            let drop: CGFloat = kind == .slide && !out ? screen.height - panel.minY + 40 : 0
            ZStack(alignment: .topLeading) {
                Image(uiImage: withoutPanel)
                    .resizable()
                    .frame(width: screen.width, height: screen.height)
                // The backdrop: dimming at once, then the picture of it
                // (blur and all) everywhere but the pop-up.
                Color.black
                    .opacity(0.5 * Double(shown))
                    .frame(width: screen.width, height: screen.height)
                Image(uiImage: withPanel)
                    .resizable()
                    .frame(width: screen.width, height: screen.height)
                    .mask { Outside(hole: panel).fill(style: FillStyle(eoFill: true)) }
                    .opacity(Double(shown))
                // The pop-up, through its glass's outline.
                Image(uiImage: withPanel)
                    .resizable()
                    .frame(width: screen.width, height: screen.height)
                    .mask { glass }
                    .opacity(kind == .close ? Double(shown) : 1)
                    .offset(y: drop)
            }
            .frame(width: screen.width, height: screen.height, alignment: .topLeading)
        }
        .ignoresSafeArea()
        .onAppear(perform: play)
    }

    @ViewBuilder
    private var glass: some View {
        if kind == .slide {
            RoundedRectangle(cornerRadius: panelRadius, style: .continuous)
                .frame(width: panel.width, height: panel.height)
                .position(x: panel.midX, y: panel.midY)
        } else {
            MorphShape(progress: out ? 1 : 0, from: button, to: panel, fromRadius: buttonRadius, toRadius: panelRadius)
        }
    }

    private func play() {
        let duration: Double
        let animation: Animation
        switch kind {
        case .open:
            // As the native account sheet opens.
            duration = 0.6
            animation = .spring(response: 0.55, dampingFraction: 0.84)
        case .close:
            duration = 0.42
            animation = .easeInOut(duration: duration)
        case .slide:
            // Carrying on at the drag's own speed, never slower than a flick.
            let speed = max(Double(velocity) * 1000, 1600)
            duration = min(0.35, max(0.18, Double(panel.height) / speed))
            animation = .easeOut(duration: duration)
        }
        DispatchQueue.main.async {
            withAnimation(animation) { out = kind == .open }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + duration + 0.02, execute: finished)
    }
}

/// Everything but `hole`, with an even-odd fill.
private struct Outside: Shape {
    let hole: CGRect

    func path(in rect: CGRect) -> Path {
        var path = Path(rect)
        path.addRect(hole)
        return path
    }
}
