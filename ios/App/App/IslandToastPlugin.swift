import Foundation
import Capacitor
import SwiftUI
import UIKit

/// Bridge for lib/native/island-toast.ts: on iPhones with a Dynamic Island,
/// the XP pop-up (each quarter of a level, components/leveling/level-overlays.tsx)
/// grows out of the island itself: a black pill widening from it with the
/// level, the XP and the quarter reached, that shrinks back into it. (A real
/// Live Activity can't: iOS keeps an app's own activity out of the island
/// while the app is open.) Phones without an island keep the web pop-up.
/// Registered in ViewController.capacitorDidLoad.
@objc(IslandToastPlugin)
public class IslandToastPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "IslandToastPlugin"
    public let jsName = "IslandToast"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "supported", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "show", returnType: CAPPluginReturnPromise),
    ]

    private var window: UIWindow?
    private var model: IslandToastModel?

    @objc func supported(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            call.resolve(["supported": Self.island(in: self.bridge?.viewController?.view.window) != nil])
        }
    }

    @objc func show(_ call: CAPPluginCall) {
        let toast = IslandToast(
            level: call.getInt("level") ?? 1,
            xp: call.getInt("xp") ?? 0,
            percent: call.getString("percent") ?? "",
            progress: call.getDouble("progress") ?? 0,
            color: call.getString("color") ?? "#ffffff",
            accent: call.getString("accent") ?? "#94a3b8"
        )
        DispatchQueue.main.async {
            let shown = self.present(toast)
            call.resolve(["shown": shown])
        }
    }

    /// Where the Dynamic Island sits, on phones that have one: their top
    /// safe area is taller than any notch's.
    static func island(in window: UIWindow?) -> CGRect? {
        guard let window, window.safeAreaInsets.top >= 51 else { return nil }
        let width: CGFloat = 126
        let height: CGFloat = 37.33
        let top: CGFloat = window.safeAreaInsets.top >= 62 ? 14 : 11.33
        return CGRect(x: (window.bounds.width - width) / 2, y: top, width: width, height: height)
    }

    @discardableResult
    func present(_ toast: IslandToast) -> Bool {
        guard let host = bridge?.viewController?.view.window, let island = Self.island(in: host),
              let scene = host.windowScene else { return false }
        // Already out: the numbers change, and it stays a moment longer.
        if let model {
            model.update(toast)
            return true
        }
        let model = IslandToastModel(toast: toast, island: island)
        let window = UIWindow(windowScene: scene)
        window.windowLevel = .statusBar + 1
        window.backgroundColor = .clear
        // Touches go straight through to the app.
        window.isUserInteractionEnabled = false
        let controller = UIHostingController(rootView: IslandToastView(model: model))
        controller.view.backgroundColor = .clear
        window.rootViewController = controller
        window.isHidden = false
        model.onDone = { [weak self] in
            self?.window?.isHidden = true
            self?.window = nil
            self?.model = nil
        }
        self.window = window
        self.model = model
        return true
    }

    #if DEBUG
    /// For the CI check: -SprindIslandDemo shows a pop-up and records the
    /// screen every 40 ms into Documents/island.
    func runDemoIfAsked() {
        guard ProcessInfo.processInfo.arguments.contains("-SprindIslandDemo") else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + 9) {
            guard let window = self.bridge?.viewController?.view.window,
                  let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else { return }
            let folder = documents.appendingPathComponent("island")
            try? FileManager.default.removeItem(at: folder)
            try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
            self.present(IslandToast(level: 57, xp: 340, percent: "50%", progress: 0.5, color: "#f0abfc", accent: "#22d3ee"))
            let format = UIGraphicsImageRendererFormat()
            format.scale = 1
            var count = 0
            Timer.scheduledTimer(withTimeInterval: 0.08, repeats: true) { timer in
                // The pop-up's own window, which is above the app's.
                let windows = window.windowScene?.windows.sorted { $0.windowLevel.rawValue < $1.windowLevel.rawValue } ?? [window]
                let image = UIGraphicsImageRenderer(bounds: window.bounds, format: format).image { _ in
                    for shown in windows where !shown.isHidden {
                        _ = shown.drawHierarchy(in: shown.bounds, afterScreenUpdates: false)
                    }
                }
                try? image.pngData()?.write(to: folder.appendingPathComponent(String(format: "frame-%02d.png", count)))
                count += 1
                if count >= 40 { timer.invalidate() }
            }
        }
    }
    #endif
}

struct IslandToast: Equatable {
    let level: Int
    let xp: Int
    /// The quarter reached, written the UI language's way ("50%").
    let percent: String
    let progress: Double
    let color: String
    let accent: String
}

final class IslandToastModel: ObservableObject {
    @Published private(set) var toast: IslandToast
    /// Out of the island and wide.
    @Published private(set) var open = false
    /// Its contents showing (they come after it widens, and go before it shrinks).
    @Published private(set) var contentsShown = false
    /// Counts the updates while it's out, to pop the numbers.
    @Published private(set) var bump = 0
    let island: CGRect
    var onDone: () -> Void = {}
    private var collapse: DispatchWorkItem?

    init(toast: IslandToast, island: CGRect) {
        self.toast = toast
        self.island = island
    }

    func start() {
        UIImpactFeedbackGenerator(style: .soft).impactOccurred()
        // The island's own springy widening.
        withAnimation(.spring(response: 0.42, dampingFraction: 0.72)) { open = true }
        withAnimation(.easeOut(duration: 0.22).delay(0.14)) { contentsShown = true }
        scheduleCollapse()
    }

    func update(_ next: IslandToast) {
        withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
            toast = next
            bump += 1
        }
        scheduleCollapse()
    }

    private func scheduleCollapse() {
        collapse?.cancel()
        let work = DispatchWorkItem { [weak self] in self?.shrink() }
        collapse = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.4, execute: work)
    }

    private func shrink() {
        withAnimation(.easeIn(duration: 0.12)) { contentsShown = false }
        withAnimation(.spring(response: 0.34, dampingFraction: 0.92).delay(0.08)) { open = false }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in self?.onDone() }
    }
}

/// The black pill, widening out of the island and shrinking back into it.
struct IslandToastView: View {
    @ObservedObject var model: IslandToastModel

    var body: some View {
        GeometryReader { geo in
            let island = model.island
            let wide = CGRect(x: (geo.size.width - min(geo.size.width - 28, 312)) / 2, y: island.minY,
                              width: min(geo.size.width - 28, 312), height: 54)
            let pill = model.open ? wide : island
            ZStack(alignment: .topLeading) {
                Capsule(style: .continuous)
                    .fill(Color.black)
                    .frame(width: pill.width, height: pill.height)
                    .offset(x: pill.minX, y: pill.minY)
                contents
                    .frame(width: wide.width - 24, height: wide.height)
                    .offset(x: wide.minX + 12, y: wide.minY)
                    .opacity(model.contentsShown ? 1 : 0)
                    .scaleEffect(model.contentsShown ? 1 : 0.7, anchor: .top)
                    .blur(radius: model.contentsShown ? 0 : 4)
            }
            .frame(width: geo.size.width, height: geo.size.height, alignment: .topLeading)
        }
        .ignoresSafeArea()
        .onAppear {
            DispatchQueue.main.async { model.start() }
        }
    }

    private var contents: some View {
        let toast = model.toast
        let color = Color(hex: toast.color)
        let accent = Color(hex: toast.accent)
        return HStack(spacing: 10) {
            LevelRing(level: toast.level, progress: toast.progress, color: color)
            Text("+\(toast.xp) XP")
                .font(AppFont.font(18, 800))
                .monospacedDigit()
                .foregroundStyle(LinearGradient(colors: [color, .white, accent], startPoint: .leading, endPoint: .trailing))
                .lineLimit(1)
                .id(model.bump)
                .transition(.scale(scale: 1.3).combined(with: .opacity))
            Spacer(minLength: 6)
            Text(toast.percent)
                .font(AppFont.font(15, 700))
                .monospacedDigit()
                .foregroundColor(color)
                .lineLimit(1)
        }
    }
}

/// The level in a ring filled to the quarter reached, as the web pop-up draws it.
private struct LevelRing: View {
    let level: Int
    let progress: Double
    let color: Color

    var body: some View {
        ZStack {
            Circle()
                .stroke(Color.white.opacity(0.15), lineWidth: 3)
            Circle()
                .trim(from: 0, to: CGFloat(min(max(progress, 0), 1)))
                .stroke(color, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                .rotationEffect(.degrees(-90))
            Text(verbatim: String(level))
                .font(AppFont.font(12, 800))
                .monospacedDigit()
                .foregroundColor(.white)
        }
        .frame(width: 32, height: 32)
    }
}
