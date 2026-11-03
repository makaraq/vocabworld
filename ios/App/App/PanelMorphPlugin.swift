import Foundation
import Capacitor
import CoreImage
import SwiftUI
import UIKit
import WebKit

/// Bridge for lib/native/panel-morph.ts: the motion of a web pop-up opening
/// out of its button and closing back into it, drawn natively at the screen's
/// full refresh rate (the web view stops at 60 fps) and looking as the web
/// morph does (lib/morph-modal.ts). The pop-up itself stays the web one.
/// `freeze` covers the screen with a picture of it; the web side then puts
/// the pop-up at rest underneath with its contents hidden, and `open` takes a
/// second picture and grows the pop-up's glass out of the button between the
/// two. `contents` pictures it once more with its contents, which come in over
/// the glass once it's most of the way out, as the web's do; then it steps
/// aside onto the identical live pop-up. `close` and `slide` run it the other
/// way. Registered in ViewController.capacitorDidLoad.
@objc(PanelMorphPlugin)
public class PanelMorphPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PanelMorphPlugin"
    public let jsName = "PanelMorph"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "freeze", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "open", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "contents", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "close", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "slide", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clear", returnType: CAPPluginReturnPromise),
    ]

    /// What covers the web view now: the frozen picture, or the morph. It goes
    /// in a window of its own over the app's: Capacitor's view controller's
    /// view is the web view itself, and anything inside it would be in the
    /// web view's pictures of the page.
    private var overlay: UIView?
    private var overlayController: UIViewController?
    private var coverWindow: UIWindow?
    /// The picture under the frozen cover.
    private var frozen: UIImage?
    /// The morph on screen, and the calls waiting for it to end.
    private var morph: PanelMorphModel?
    private var waiting: [CAPPluginCall] = []
    /// Counts the freezes, so a backdrop worked out for an earlier one is let go.
    private var freezes = 0
    /// The backdrop being opened over, and the page under it once worked out.
    private var backdrop: PanelBackdrop?
    private var backdropPicture: UIImage?
    /// The account sheet's own glass (SheetGlass), made from the page as the
    /// pop-up opens and kept for its close: the pop-ups grow out of their
    /// button just as the account sheet does.
    private var glassPicture: UIImage?

    @objc func freeze(_ call: CAPPluginCall) {
        let backdrop = PanelBackdrop(call.getObject("backdrop"))
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
                self.endMorph()
                self.freezes += 1
                call.resolve()
                // Opening: the page under the backdrop is worked out while the
                // pop-up is put in place underneath.
                guard let backdrop else { return }
                let generation = self.freezes
                self.backdrop = backdrop
                self.backdropPicture = nil
                self.glassPicture = nil
                DispatchQueue.global(qos: .userInitiated).async {
                    let picture = backdrop.picture(of: image)
                    DispatchQueue.main.async {
                        guard self.freezes == generation else { return }
                        self.backdropPicture = picture
                        if let picture { self.morph?.backdropPictured(picture) }
                    }
                }
            }
        }
    }

    @objc func open(_ call: CAPPluginCall) {
        run(call, kind: .open)
    }

    @objc func contents(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let morph = self.morph, morph.kind == .open else {
                call.resolve()
                return
            }
            self.waiting.append(call)
            self.snapshot { picture in
                if let picture, self.morph === morph { morph.contentsPictured(picture) }
            }
        }
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
            self.forget()
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
            // Opening sets out at once from the frozen page (the pop-up's
            // contents are pictured next, `contents`); closing pictures the
            // page without the pop-up first.
            let pictured: (@escaping (UIImage?) -> Void) -> Void = kind == .open
                ? { $0(before) }
                : { self.snapshot($0) }
            pictured { after in
                guard let after else {
                    self.uncover()
                    call.resolve()
                    return
                }
                let opening = kind == .open
                let panel = opening ? (to ?? from) : from
                let page = opening ? before : after
                // The account sheet's glass, made from the page behind.
                let glass = self.glassPicture ?? Self.sheetGlass(of: page)
                self.glassPicture = glass
                let model = PanelMorphModel(
                    kind: kind,
                    page: page,
                    glass: glass,
                    whole: opening ? nil : before,
                    backdrop: self.backdropPicture,
                    tint: self.backdrop?.tint ?? .clear,
                    panel: panel,
                    button: opening ? from : (to ?? from),
                    panelRadius: opening ? toRadius : fromRadius,
                    buttonRadius: opening ? fromRadius : toRadius,
                    velocity: velocity
                )
                model.onEnd = { [weak self, weak model] in
                    guard let self, let model, self.morph === model else { return }
                    self.uncover()
                    if !opening { self.forget() }
                }
                let controller = UIHostingController(rootView: PanelMorphView(model: model))
                controller.view.backgroundColor = .clear
                self.cover(with: controller.view, controller: controller)
                self.morph = model
                // Opening goes on while the contents are pictured (`contents`).
                if opening {
                    call.resolve()
                } else {
                    self.waiting.append(call)
                }
            }
        }
    }

    /// The native account sheet's glass (SheetGlass: the page dimmed and
    /// blurred by the web sheet's own CSS numbers), at one pixel per point.
    private static func sheetGlass(of page: UIImage) -> UIImage? {
        guard let source = page.cgImage,
              let plain = AccountSheetPlugin.plainSRGB(source, width: page.size.width, height: page.size.height)
        else { return nil }
        return SheetGlass.make(from: plain, scale: 1, button: nil)?.sheet
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
        guard let root = coverRoot() else { return }
        view.frame = root.view.bounds
        view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.isUserInteractionEnabled = true
        if let controller {
            root.addChild(controller)
            root.view.addSubview(view)
            controller.didMove(toParent: root)
        } else {
            root.view.addSubview(view)
        }
        let previous = overlay
        let previousController = overlayController
        overlay = view
        overlayController = controller
        remove(previous, previousController)
    }

    /// The cover's window, put up over the app's when first needed.
    private func coverRoot() -> UIViewController? {
        if let root = coverWindow?.rootViewController { return root }
        guard let app = bridge?.viewController, let scene = app.view.window?.windowScene else { return nil }
        let window = UIWindow(windowScene: scene)
        window.windowLevel = .normal + 1
        window.backgroundColor = .clear
        let root = StatusBarAsApp(app: app)
        window.rootViewController = root
        window.isHidden = false
        coverWindow = window
        return root
    }

    private func uncover() {
        remove(overlay, overlayController)
        overlay = nil
        overlayController = nil
        coverWindow?.isHidden = true
        coverWindow = nil
        frozen = nil
        endMorph()
    }

    /// The morph is over (or given up): whatever waited on it hears.
    private func endMorph() {
        morph = nil
        let calls = waiting
        waiting = []
        for call in calls { call.resolve() }
    }

    /// The pop-up has gone: what was kept of it goes too.
    private func forget() {
        backdrop = nil
        backdropPicture = nil
        glassPicture = nil
    }

    private func remove(_ view: UIView?, _ controller: UIViewController?) {
        controller?.willMove(toParent: nil)
        view?.removeFromSuperview()
        controller?.removeFromParent()
    }

    #if DEBUG
    /// For the CI check: -SprindMorphDemo opens the test page's pop-up and
    /// closes it again (window.__morphTest, in the workflow's stand-in page),
    /// recording the screen every 40 ms into Documents/morph while either is
    /// on screen.
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
            let start = Date()
            var count = 0
            var tail = 0
            Timer.scheduledTimer(withTimeInterval: 0.04, repeats: true) { timer in
                if count >= 60 || Date().timeIntervalSince(start) > 9 {
                    timer.invalidate()
                    return
                }
                // The first two, then only while the cover is up and just after.
                if self.overlay != nil {
                    tail = 2
                } else if tail > 0 {
                    tail -= 1
                } else if count >= 2 {
                    return
                }
                // The cover's own window too, over the app's.
                let windows = window.windowScene?.windows.sorted { $0.windowLevel.rawValue < $1.windowLevel.rawValue } ?? [window]
                let image = UIGraphicsImageRenderer(bounds: window.bounds, format: format).image { _ in
                    for shown in windows where !shown.isHidden {
                        _ = shown.drawHierarchy(in: shown.bounds, afterScreenUpdates: false)
                    }
                }
                try? image.pngData()?.write(to: folder.appendingPathComponent(String(format: "frame-%02d.png", count)))
                count += 1
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

/// The root of a window put up over the app's (the morph's cover, the
/// island's pop-up): it leaves the status bar as the app has it, unless told
/// to hide it meanwhile.
final class StatusBarAsApp: UIViewController {
    private weak var app: UIViewController?

    var hidesStatusBar = false {
        didSet {
            guard hidesStatusBar != oldValue else { return }
            UIView.animate(withDuration: 0.25) { self.setNeedsStatusBarAppearanceUpdate() }
        }
    }

    init(app: UIViewController) {
        self.app = app
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) is not used")
    }

    override func loadView() {
        view = UIView()
        view.backgroundColor = .clear
    }

    override var preferredStatusBarStyle: UIStatusBarStyle { app?.preferredStatusBarStyle ?? .default }
    override var prefersStatusBarHidden: Bool { hidesStatusBar || (app?.prefersStatusBarHidden ?? false) }
    override var preferredStatusBarUpdateAnimation: UIStatusBarAnimation { .fade }
}

private extension CGRect {
    /// The same box, give or take a point.
    func isAbout(_ other: CGRect) -> Bool {
        abs(minX - other.minX) < 1 && abs(minY - other.minY) < 1
            && abs(width - other.width) < 1 && abs(height - other.height) < 1
    }
}

/// A pop-up's backdrop by its CSS (lib/native/panel-morph.ts reads it): the
/// page blurred by its backdrop-filter, with its background colour on top.
/// The pictures only show it round the pop-up; this draws it under the
/// pop-up too, where the glass hasn't got to yet.
struct PanelBackdrop {
    let blur: CGFloat
    let red: CGFloat
    let green: CGFloat
    let blue: CGFloat
    let alpha: CGFloat

    init?(_ object: JSObject?) {
        guard let object else { return nil }
        func number(_ key: String) -> CGFloat {
            CGFloat((object[key] as? NSNumber)?.doubleValue ?? 0)
        }
        blur = number("blur")
        red = number("red")
        green = number("green")
        blue = number("blue")
        alpha = number("alpha")
    }

    /// Its colour alone, standing in until the page under it is worked out.
    var tint: Color {
        Color(.sRGB, red: Double(red), green: Double(green), blue: Double(blue), opacity: Double(alpha))
    }

    /// The page as the backdrop shows it, at one pixel per point (it's blurred).
    func picture(of page: UIImage) -> UIImage? {
        guard let source = page.cgImage,
              let plain = AccountSheetPlugin.plainSRGB(source, width: page.size.width, height: page.size.height),
              let space = CGColorSpace(name: CGColorSpace.sRGB) else { return nil }
        var image = CIImage(cgImage: plain)
        let extent = image.extent
        if blur > 0 {
            image = image.clampedToExtent().applyingGaussianBlur(sigma: Double(blur)).cropped(to: extent)
        }
        if alpha > 0 {
            image = CIImage(color: CIColor(red: red, green: green, blue: blue, alpha: alpha))
                .cropped(to: extent)
                .composited(over: image)
        }
        guard let result = Self.context.createCGImage(image, from: extent, format: .RGBA8, colorSpace: space) else { return nil }
        return UIImage(cgImage: result, scale: 1, orientation: .up)
    }

    /// In plain sRGB values, as browsers composite CSS (and SheetGlass works).
    private static let context = CIContext(options: [.workingColorSpace: NSNull()])
}

enum PanelMorphKind {
    case open, close, slide
}

/// One morph: its pictures, and how far it has got. Its timings are the web
/// morph's (lib/morph-modal.ts, WebMotion).
final class PanelMorphModel: ObservableObject {
    let kind: PanelMorphKind
    /// The page without the pop-up: before it opens, or once it has gone.
    let page: UIImage
    /// The account sheet's glass made from the page (SheetGlass), which the
    /// pop-up grows as.
    let glass: UIImage?
    /// The whole pop-up as it shows, contents and all. Opening, it's
    /// pictured a moment after the glass sets out.
    @Published private(set) var whole: UIImage?
    /// The page under the pop-up's backdrop; its colour alone until then.
    @Published private(set) var backdrop: UIImage?
    let tint: Color
    let panel: CGRect
    let button: CGRect
    let panelRadius: CGFloat
    let buttonRadius: CGFloat
    /// The drag's speed at release, in points per millisecond (sliding away).
    let velocity: CGFloat
    var onEnd: () -> Void = {}

    /// The glass out of the button, at rest.
    @Published private(set) var out: Bool
    @Published private(set) var dimmed: Bool
    @Published private(set) var contentsShown: Bool
    /// The button's own picture over the glass: going as the glass sets out
    /// of it, back as the glass returns.
    @Published private(set) var buttonShown: Bool
    /// Sliding away: how far down it has gone.
    @Published private(set) var drop: CGFloat = 0

    private var startedAt: Date?
    private var moved = false
    private var settled: Bool
    private var ended = false

    init(kind: PanelMorphKind, page: UIImage, glass: UIImage?, whole: UIImage?, backdrop: UIImage?, tint: Color,
         panel: CGRect, button: CGRect, panelRadius: CGFloat, buttonRadius: CGFloat, velocity: CGFloat) {
        self.kind = kind
        self.page = page
        self.glass = glass
        self.whole = whole
        self.backdrop = backdrop
        self.tint = tint
        self.panel = panel
        self.button = button
        self.panelRadius = panelRadius
        self.buttonRadius = buttonRadius
        self.velocity = velocity
        let opening = kind == .open
        out = !opening
        dimmed = !opening
        contentsShown = !opening
        buttonShown = opening
        settled = !opening
    }

    func start(screen: CGSize) {
        guard startedAt == nil else { return }
        startedAt = Date()
        let duration: Double
        switch kind {
        case .open:
            duration = WebMotion.openDuration
            withAnimation(WebMotion.open) { out = true }
            withAnimation(WebMotion.backdropIn) { dimmed = true }
            withAnimation(WebMotion.buttonOut) { buttonShown = false }
            if whole != nil { bringContentsIn() }
            // Without its contents pictured in time it hands over anyway: the
            // live pop-up has them.
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) { [weak self] in
                self?.settled = true
                self?.endIfDone()
            }
        case .close:
            duration = WebMotion.closeDuration
            withAnimation(WebMotion.close) { out = false }
            withAnimation(WebMotion.backdropOut) { dimmed = false }
            withAnimation(WebMotion.contentsOut) { contentsShown = false }
            withAnimation(WebMotion.buttonBack) { buttonShown = true }
        case .slide:
            // On down from where the drag left it, at the drag's pace or a
            // little quicker, the button forming again meanwhile.
            let travel = screen.height - panel.minY + 24
            duration = WebMotion.slideDuration(travel: travel, velocity: velocity * 1000)
            withAnimation(WebMotion.slide(duration)) { drop = travel }
            withAnimation(.easeOut(duration: duration)) { dimmed = false }
            withAnimation(.easeOut(duration: duration * 0.87).delay(duration * 0.13)) { buttonShown = true }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + duration + 0.02) { [weak self] in
            self?.moved = true
            self?.endIfDone()
        }
    }

    /// Opening: the pop-up pictured with its contents.
    func contentsPictured(_ picture: UIImage) {
        guard kind == .open, whole == nil, !ended else { return }
        whole = picture
        if startedAt != nil { bringContentsIn() }
    }

    func backdropPictured(_ picture: UIImage) {
        guard backdrop == nil, !ended else { return }
        backdrop = picture
    }

    /// As the web's come in: once the glass is most of the way out (330 ms),
    /// or as soon after as they're pictured.
    private func bringContentsIn() {
        let elapsed = startedAt.map { Date().timeIntervalSince($0) } ?? 0
        DispatchQueue.main.asyncAfter(deadline: .now() + max(0, 0.33 - elapsed)) { [weak self] in
            guard let self, !self.ended else { return }
            withAnimation(WebMotion.settle) { self.contentsShown = true }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in
                self?.settled = true
                self?.endIfDone()
            }
        }
    }

    private func endIfDone() {
        guard moved, settled, !ended else { return }
        ended = true
        onEnd()
    }
}

/// The morph, drawn from pictures of the screen as the web morph draws it:
/// the page, the backdrop coming in over it, and the pop-up's glass growing
/// out of the button with the button's picture fading off it, the contents
/// coming in once it's most of the way out. Closing, the contents go first,
/// the glass draws back into the button and the button's picture comes back
/// over it. Sliding away, the pop-up goes on down as it is.
struct PanelMorphView: View {
    @ObservedObject var model: PanelMorphModel

    var body: some View {
        GeometryReader { geo in
            let screen = geo.size
            let dim: Double = model.dimmed ? 1 : 0
            ZStack(alignment: .topLeading) {
                picture(model.page, screen)
                // The backdrop: under the pop-up as its CSS draws it (its
                // colour alone until that's worked out), round it as pictured.
                Group {
                    if let backdrop = model.backdrop {
                        picture(backdrop, screen)
                    } else {
                        model.tint.frame(width: screen.width, height: screen.height)
                    }
                }
                .opacity(dim)
                if let around = model.whole {
                    picture(around, screen)
                        .mask { Outside(hole: model.panel).fill(style: FillStyle(eoFill: true)) }
                        .opacity(dim)
                }
                popUp(screen)
                picture(model.page, screen)
                    .mask { box(model.button, radius: model.buttonRadius) }
                    .opacity(model.buttonShown ? 1 : 0)
            }
            .frame(width: screen.width, height: screen.height, alignment: .topLeading)
            .onAppear {
                DispatchQueue.main.async { model.start(screen: screen) }
            }
        }
        .ignoresSafeArea()
    }

    @ViewBuilder
    private func popUp(_ screen: CGSize) -> some View {
        if model.kind == .slide {
            if let whole = model.whole {
                picture(whole, screen)
                    .mask { box(model.panel, radius: model.panelRadius) }
                    .offset(y: model.drop)
            }
        } else {
            let shape = MorphShape(progress: model.out ? 1 : 0, from: model.button, to: model.panel,
                                   fromRadius: model.buttonRadius, toRadius: model.panelRadius)
            // The account sheet's own glass, grown as it grows (AccountSheetHost),
            if let glass = model.glass {
                sheetGlass(glass, screen).mask { shape }
            }
            // the pop-up itself coming in over it once it's most of the way out,
            if let whole = model.whole {
                picture(whole, screen)
                    .mask { shape }
                    .opacity(model.contentsShown ? 1 : 0)
            }
            // and the account sheet's lit rim round it all the way.
            shape.stroke(AccountSheetHost.rim, lineWidth: 1.5)
                .opacity(model.contentsShown && model.out ? 0 : 1)
        }
    }

    /// The glass as the account sheet draws it: the page through it, a 10%
    /// white wash and a sheen lit from the top left.
    private func sheetGlass(_ image: UIImage, _ screen: CGSize) -> some View {
        ZStack(alignment: .topLeading) {
            picture(image, screen)
            Color.white.opacity(0.1)
            AccountSheetHost.sheen
                .frame(width: model.panel.width, height: model.panel.height)
                .offset(x: model.panel.minX, y: model.panel.minY)
        }
        .frame(width: screen.width, height: screen.height, alignment: .topLeading)
    }

    private func picture(_ image: UIImage, _ screen: CGSize) -> some View {
        Image(uiImage: image)
            .resizable()
            .frame(width: screen.width, height: screen.height)
    }

    private func box(_ rect: CGRect, radius: CGFloat) -> some View {
        RoundedRectangle(cornerRadius: radius, style: .continuous)
            .frame(width: rect.width, height: rect.height)
            .position(x: rect.midX, y: rect.midY)
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
