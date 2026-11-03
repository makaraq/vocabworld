import SwiftUI
import UIKit
import CoreText

// Manage Account, drawn natively to look exactly like the web sheet
// (components/account/manage-account-modal.tsx, as the iPhone's Liquid Glass
// skin draws it: app/liquid-glass.css). Same cards in the same order, the same
// Space Grotesk font (Fonts/, made from the web's own font files), the same
// Solar icons (Assets.xcassets/Solar) and the same colours: Tailwind's, with
// white written as Color.primary so a light theme turns it dark. The state
// and rules come from the web side (AccountSheetState.swift).

// ── The web's type, icons and colours ───────────────────────────────────────

/// Space Grotesk, as on the web pages, at a CSS weight (the font spans
/// 300–700; heavier asks get 700, as in the browser). Characters it lacks
/// fall back to its latin-ext and Vietnamese parts, then to the system font.
enum AppFont {
    private static let ready: Bool = {
        for file in ["SpaceGrotesk", "SpaceGrotesk-LatinExt", "SpaceGrotesk-Vietnamese"] {
            if let url = Bundle.main.url(forResource: file, withExtension: "ttf") {
                _ = CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
            }
        }
        return UIFont(name: "SpaceGrotesk", size: 12) != nil
    }()
    private static var cache: [String: Font] = [:]
    private static let variationKey = UIFontDescriptor.AttributeName(rawValue: kCTFontVariationAttribute as String)

    static func font(_ size: CGFloat, _ weight: Int = 400) -> Font {
        let key = "\(size)-\(weight)"
        if let hit = cache[key] { return hit }
        let font: Font
        if ready {
            let wght = min(max(weight, 300), 700)
            let variation: [NSNumber: NSNumber] = [NSNumber(value: 0x7767_6874): NSNumber(value: wght)]
            func descriptor(_ name: String) -> UIFontDescriptor {
                UIFontDescriptor(fontAttributes: [.name: name, variationKey: variation])
            }
            let main = descriptor("SpaceGrotesk").addingAttributes([
                .cascadeList: [descriptor("SpaceGroteskLatinExt"), descriptor("SpaceGroteskVietnamese")],
            ])
            font = Font(UIFont(descriptor: main, size: size) as CTFont)
        } else {
            font = .system(size: size, weight: systemWeight(weight))
        }
        cache[key] = font
        return font
    }

    private static func systemWeight(_ weight: Int) -> Font.Weight {
        switch weight {
        case ..<350: return .light
        case ..<450: return .regular
        case ..<550: return .medium
        case ..<650: return .semibold
        case ..<750: return .bold
        default: return .heavy
        }
    }
}

/// A Solar icon, as the web draws it (Assets.xcassets/Solar).
struct SolarIcon: View {
    let name: String
    let size: CGFloat

    init(_ name: String, _ size: CGFloat) {
        self.name = name
        self.size = size
    }

    var body: some View {
        Image("solar-\(name)")
            .renderingMode(.template)
            .resizable()
            .scaledToFit()
            .frame(width: size, height: size)
    }
}

/// The Tailwind colours the web sheet uses.
enum Tw {
    static let yellow300 = Color(hex: "#fde047")
    static let yellow400 = Color(hex: "#facc15")
    static let yellow500 = Color(hex: "#eab308")
    static let orange300 = Color(hex: "#fdba74")
    static let orange400 = Color(hex: "#fb923c")
    static let orange500 = Color(hex: "#f97316")
    static let amber500 = Color(hex: "#f59e0b")
    static let blue300 = Color(hex: "#93c5fd")
    static let blue400 = Color(hex: "#60a5fa")
    static let blue500 = Color(hex: "#3b82f6")
    static let violet400 = Color(hex: "#a78bfa")
    static let emerald300 = Color(hex: "#6ee7b7")
    static let emerald400 = Color(hex: "#34d399")
    static let red300 = Color(hex: "#fca5a5")
    static let red400 = Color(hex: "#f87171")
    static let red500 = Color(hex: "#ef4444")
}

/// "white/55" and friends: the web's white text and fills at an opacity.
private func ink(_ opacity: Double = 1) -> Color {
    Color.primary.opacity(opacity)
}

// ── The sheet ────────────────────────────────────────────────────────────────

struct AccountSheetView: View {
    @ObservedObject var model: AccountSheetModel
    @State private var confirmingDelete = false

    var body: some View {
        VStack(spacing: 0) {
            // The web sheet's own handle (the system one is hidden).
            Capsule()
                .fill(ink(0.3))
                .frame(width: 40, height: 4)
                .padding(.top, 12)
                .padding(.bottom, 4)
            header
            ZStack {
                if confirmingDelete {
                    DeleteConfirmView(
                        delete: model.state.delete,
                        onCancel: {
                            withAnimation(.spring(response: 0.4, dampingFraction: 0.86)) { confirmingDelete = false }
                        },
                        onConfirm: {
                            UINotificationFeedbackGenerator().notificationOccurred(.warning)
                            model.send("deleteAccount")
                        }
                    )
                    .transition(.move(edge: .trailing).combined(with: .opacity))
                } else {
                    mainScroll
                        .transition(.move(edge: .leading).combined(with: .opacity))
                }
            }
            .frame(maxHeight: .infinity, alignment: .top)
        }
        .foregroundColor(ink())
    }

    private var header: some View {
        HStack {
            Text(model.state.title)
                .font(AppFont.font(18, 700))
                .tracking(0.45)
            Spacer()
            Button {
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                model.close()
            } label: {
                SolarIcon("close-circle-bold", 20)
                    .foregroundColor(ink(0.7))
                    .frame(width: 32, height: 32)
                    .contentShape(Circle())
                    .modifier(WebGlass(shape: Circle()))
            }
            .buttonStyle(PressStyle())
            .accessibilityLabel(Text(model.state.closeLabel))
        }
        .padding(.horizontal, 20)
        .padding(.top, 8)
        .padding(.bottom, 16)
    }

    private var mainScroll: some View {
        let s = model.state
        return ScrollViewReader { proxy in
            ScrollView(showsIndicators: false) {
                VStack(spacing: 12) {
                    LevelCardView(level: s.level, profile: s.profile, avatar: model.avatar)

                    SubscriptionCard(subscription: s.subscription)

                    ThemeCard(
                        theme: s.theme,
                        onPick: { item in
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                            if !(item.premium && !s.subscription.premium) {
                                model.state.theme.current = item.id
                            }
                            model.send("theme", item.id)
                        },
                        onTryLive: { model.send("tryThemes") }
                    )
                    .id("theme")

                    if let notifications = s.notifications {
                        NotificationsCard(notifications: notifications)
                            .id("notifications")
                    }

                    if let board = s.leaderboard {
                        LeaderboardCard(board: board) { on in
                            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                            model.state.leaderboard?.on = on
                            model.send("leaderboard", on ? "on" : "off")
                        }
                    }

                    if let widget = s.widget {
                        // The web side's hooks give these their haptics.
                        WidgetCard(
                            widget: widget,
                            onSource: { value in
                                model.state.widget?.source = value
                                model.send("widgetSource", value)
                            },
                            onAdd: { model.send("widgetAdd") }
                        )
                    }

                    if let offline = s.offline {
                        OfflineCard(offline: offline, images: model.images) { action, id in
                            model.send("offline", "\(action):\(id)")
                        }
                        .id("offline")
                    }

                    Rectangle()
                        .fill(ink(0.1))
                        .frame(height: 1)
                        .padding(.vertical, 4)

                    VStack(spacing: 12) {
                        AccountButton(icon: "settings-bold", title: s.buttons.manageSubscription) {
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                            model.onManageSubscriptions()
                        }
                        AccountButton(icon: "trash-bin-trash-bold", title: s.buttons.deleteAccount) {
                            UINotificationFeedbackGenerator().notificationOccurred(.warning)
                            withAnimation(.spring(response: 0.4, dampingFraction: 0.86)) { confirmingDelete = true }
                        }
                        AccountButton(icon: "logout-3-bold", title: s.buttons.signOut) {
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                            model.send("signOut")
                        }
                    }
                    .id("buttons")
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 32)
                .background(ScrollViewFinder { model.scrollView = $0 })
            }
            .onAppear {
                if model.focus == "notifications" {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
                        withAnimation(.spring(response: 0.5, dampingFraction: 0.9)) {
                            proxy.scrollTo("notifications", anchor: .top)
                        }
                    }
                }
                #if DEBUG
                demoTour(proxy)
                #endif
            }
        }
    }

    #if DEBUG
    /// -SprindAccountDemoScroll theme|offline|buttons|delete: where the CI
    /// check's screenshots look.
    private func demoTour(_ proxy: ScrollViewProxy) {
        let args = ProcessInfo.processInfo.arguments
        guard let index = args.firstIndex(of: "-SprindAccountDemoScroll"), index + 1 < args.count else { return }
        let stop = args[index + 1]
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
            if stop == "delete" {
                withAnimation { confirmingDelete = true }
            } else if stop != "top" {
                proxy.scrollTo(stop, anchor: .top)
            }
        }
    }
    #endif
}

// ── Level card ───────────────────────────────────────────────────────────────

/// Your avatar in its border, your title, level and XP bar, then every border
/// in a row: tap one to wear it for a moment (components/leveling/level-card.tsx).
private struct LevelCardView: View {
    let level: AccountState.Level
    let profile: AccountState.Profile
    let avatar: UIImage?

    @State private var preview: String? = nil
    @State private var previewToken = 0
    @State private var fill: Double = 0

    private static let fallback = AccountState.Rank(id: "tourist", minLevel: 1, title: "", color: "#e2e8f0",
                                                    accent: "#94a3b8", owned: true, unlockLabel: "")

    private var earned: AccountState.Rank {
        level.ranks.first { $0.id == level.rank } ?? Self.fallback
    }

    private var shown: AccountState.Rank {
        guard let preview else { return earned }
        return level.ranks.first { $0.id == preview } ?? earned
    }

    var body: some View {
        let shown = self.shown
        let earned = self.earned
        let color = Color(hex: shown.color)
        let accent = Color(hex: shown.accent)
        let ownedCount = level.ranks.filter { $0.owned }.count
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 20) {
                LevelAvatarView(
                    border: BorderStyle(rawValue: shown.id) ?? .tourist,
                    level: level.level,
                    color: color,
                    accent: accent,
                    size: 72,
                    image: avatar,
                    initials: profile.initials
                )
                .id(shown.id)
                .transition(.scale(scale: 0.5).combined(with: .opacity))
                .padding(.horizontal, 16)
                .padding(.vertical, 12)

                VStack(alignment: .leading, spacing: 0) {
                    Text(profile.name)
                        .font(AppFont.font(16, 600))
                        .lineLimit(1)
                    if let email = profile.email, !email.isEmpty, email != profile.name {
                        Text(email)
                            .font(AppFont.font(12))
                            .foregroundColor(ink(0.55))
                            .lineLimit(1)
                    }
                    HStack(spacing: 0) {
                        ShinyText(text: shown.title, color: color, accent: accent)
                        if preview != nil {
                            Text(" · \(level.previewLabel)")
                                .font(AppFont.font(14, 600))
                                .foregroundColor(ink(0.5))
                                .lineLimit(1)
                        }
                    }
                    .padding(.top, 4)
                }
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 16)
            .padding(.top, 20)
            .padding(.bottom, 16)

            VStack(alignment: .leading, spacing: 0) {
                HStack(alignment: .firstTextBaseline) {
                    Text(level.levelLabel)
                        .font(AppFont.font(14, 700))
                    Spacer()
                    Text(level.xpLabel)
                        .font(AppFont.font(12).monospacedDigit())
                        .foregroundColor(ink(0.55))
                }
                .padding(.bottom, 6)
                XPBar(progress: fill, color: Color(hex: earned.color), accent: Color(hex: earned.accent))
                if let hint = level.hint {
                    Text(hint)
                        .font(AppFont.font(11))
                        .foregroundColor(ink(0.45))
                        .padding(.top, 6)
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 16)

            Rectangle()
                .fill(ink(0.1))
                .frame(height: 1)

            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 6) {
                    SolarIcon("medal-ribbons-star-bold", 14)
                        .foregroundColor(ink(0.6))
                    Text(level.bordersLabel)
                        .font(AppFont.font(12, 600))
                        .foregroundColor(ink(0.7))
                    Text("\(ownedCount)/\(level.ranks.count)")
                        .font(AppFont.font(12))
                        .foregroundColor(ink(0.4))
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 8)
                gallery(shownId: shown.id)
            }
            .padding(.top, 12)
            .padding(.bottom, 14)
        }
        .modifier(CardSurface())
        .onAppear {
            // The bar fills from empty as the sheet opens.
            withAnimation(.spring(response: 1.1, dampingFraction: 0.85).delay(0.3)) {
                fill = level.progress
            }
        }
        .onChange(of: level.progress) { value in
            withAnimation(.spring(response: 0.9, dampingFraction: 0.85)) {
                fill = value
            }
        }
    }

    private func gallery(shownId: String) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 4) {
                ForEach(level.ranks) { rank in
                    let active = rank.id == shownId
                    Button {
                        tryOn(rank.id)
                    } label: {
                        VStack(spacing: 8) {
                            ZStack {
                                LevelAvatarView(
                                    border: BorderStyle(rawValue: rank.id) ?? .tourist,
                                    level: rank.minLevel,
                                    color: Color(hex: rank.color),
                                    accent: Color(hex: rank.accent),
                                    size: 40,
                                    image: avatar,
                                    initials: profile.initials,
                                    showLevel: false,
                                    animated: active
                                )
                                .grayscale(rank.owned ? 0 : 1)
                                .opacity(rank.owned ? 1 : 0.45)
                                if !rank.owned {
                                    SolarIcon("lock-keyhole-bold", 16)
                                        .foregroundColor(.white)
                                        .shadow(color: Color.black.opacity(0.5), radius: 2, x: 0, y: 1)
                                }
                            }
                            .frame(width: 40, height: 40)
                            Text(rank.unlockLabel)
                                .font(AppFont.font(10))
                                .foregroundColor(ink(rank.owned ? 0.8 : 0.4))
                                .lineLimit(1)
                        }
                        .frame(width: 68)
                        .padding(.vertical, 8)
                        .background(
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .fill(ink(active ? 0.1 : 0))
                        )
                    }
                    .buttonStyle(PressStyle())
                    .accessibilityLabel(Text(rank.title))
                }
            }
            .padding(.horizontal, 12)
            .padding(.top, 12)
            .padding(.bottom, 4)
        }
    }

    private func tryOn(_ id: String) {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        previewToken += 1
        let token = previewToken
        withAnimation(.spring(response: 0.42, dampingFraction: 0.62)) {
            preview = id == level.rank ? nil : id
        }
        guard id != level.rank else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.6) {
            guard token == previewToken else { return }
            withAnimation(.spring(response: 0.42, dampingFraction: 0.75)) {
                preview = nil
            }
        }
    }
}

private struct XPBar: View {
    let progress: Double
    let color: Color
    let accent: Color

    var body: some View {
        GeometryReader { geo in
            let clamped = CGFloat(min(max(progress, 0), 1))
            let width = max(geo.size.width * 0.03, geo.size.width * clamped)
            ZStack(alignment: .leading) {
                Capsule().fill(Color.black.opacity(0.3))
                Capsule()
                    .fill(LinearGradient(colors: [accent, color], startPoint: .leading, endPoint: .trailing))
                    .overlay(Shimmer().clipShape(Capsule()))
                    .frame(width: width)
                    .shadow(color: color, radius: 5)
            }
        }
        .frame(height: 10)
        .overlay(Capsule().strokeBorder(ink(0.1), lineWidth: 1))
    }
}

/// A band of light sweeping along the XP bar every 2.4 s.
private struct Shimmer: View {
    var body: some View {
        TimelineView(.animation) { context in
            let p = cyclePosition(context.date.timeIntervalSinceReferenceDate, 2.4)
            let x: Double = p < 0.6 ? -1 + 2 * easeInOut(p / 0.6) : 1
            GeometryReader { geo in
                LinearGradient(gradient: Gradient(stops: [
                    .init(color: Color.white.opacity(0), location: 0.2),
                    .init(color: Color.white.opacity(0.55), location: 0.5),
                    .init(color: Color.white.opacity(0), location: 0.8),
                ]), startPoint: .leading, endPoint: .trailing)
                .offset(x: CGFloat(x) * geo.size.width)
            }
        }
        .allowsHitTesting(false)
    }
}

private func easeInOut(_ x: Double) -> Double {
    x < 0.5 ? 2 * x * x : 1 - pow(-2 * x + 2, 2) / 2
}

/// The rank title, with light running through it in the rank's colours
/// (.lvl-shiny-text).
private struct ShinyText: View {
    let text: String
    let color: Color
    let accent: Color

    var body: some View {
        TimelineView(.animation) { context in
            let p = CGFloat(cyclePosition(context.date.timeIntervalSinceReferenceDate, 2.5)) * 2
            Text(text)
                .font(AppFont.font(14, 800))
                .lineLimit(1)
                .foregroundStyle(
                    LinearGradient(
                        colors: [color, .white, accent, .white, color, .white, accent, .white, color],
                        startPoint: UnitPoint(x: -p, y: 0.5),
                        endPoint: UnitPoint(x: 4 - p, y: 0.5)
                    )
                )
        }
    }
}

// ── Cards ────────────────────────────────────────────────────────────────────

private struct Card<Content: View>: View {
    var spacing: CGFloat = 12
    var horizontal: CGFloat = 16
    var vertical: CGFloat = 16
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: spacing) {
            content
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, horizontal)
        .padding(.vertical, vertical)
        .modifier(CardSurface())
    }
}

/// An icon beside a title and its line of description, as the web cards head themselves.
private struct SectionLabel: View {
    let icon: String
    var iconSize: CGFloat = 18
    let tint: Color
    let title: String
    var titleWeight: Int = 500
    var desc: String? = nil
    var descSize: CGFloat = 12
    var descOpacity: Double = 0.45

    var body: some View {
        HStack(spacing: 10) {
            SolarIcon(icon, iconSize)
                .foregroundColor(tint)
            VStack(alignment: .leading, spacing: descSize < 12 ? 2 : 0) {
                Text(title)
                    .font(AppFont.font(14, titleWeight))
                if let desc {
                    Text(desc)
                        .font(AppFont.font(descSize))
                        .foregroundColor(ink(descOpacity))
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
    }
}

/// A small rounded badge: "On", "Added", "Free".
private struct Badge: View {
    let text: String
    let fill: Color
    let stroke: Color
    let textColor: Color

    var body: some View {
        Text(text)
            .font(AppFont.font(12))
            .foregroundColor(textColor)
            .lineLimit(1)
            .padding(.horizontal, 8)
            .padding(.vertical, 2)
            .background(Capsule().fill(fill))
            .overlay(Capsule().strokeBorder(stroke, lineWidth: 1))
    }
}

private struct SubscriptionCard: View {
    let subscription: AccountState.Subscription

    var body: some View {
        Card {
            HStack {
                HStack(spacing: 8) {
                    SolarIcon("crown-bold", 20)
                        .foregroundColor(Tw.yellow400)
                    Text(subscription.title)
                        .font(AppFont.font(14, 600))
                }
                Spacer()
                if subscription.premium {
                    Text(subscription.badge)
                        .font(AppFont.font(12, 600))
                        .foregroundColor(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 2)
                        .background(Capsule().fill(LinearGradient(colors: [Tw.yellow500, Tw.orange500],
                                                                  startPoint: .leading, endPoint: .trailing)))
                } else {
                    Text(subscription.badge)
                        .font(AppFont.font(12, 600))
                        .foregroundColor(ink(0.6))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 2)
                        .background(Capsule().fill(ink(0.1)))
                        .overlay(Capsule().strokeBorder(ink(0.2), lineWidth: 1))
                }
            }
            if !subscription.lines.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(subscription.lines, id: \.self) { line in
                        Text(line)
                            .font(AppFont.font(12))
                            .foregroundColor(ink(0.6))
                    }
                }
            }
        }
    }
}

private struct ThemeCard: View {
    let theme: AccountState.Theme
    let onPick: (AccountState.Theme.Item) -> Void
    let onTryLive: () -> Void

    var body: some View {
        Card {
            SectionLabel(icon: "palette-bold", tint: ink(0.7), title: theme.title, desc: theme.desc)
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 3), spacing: 8) {
                ForEach(theme.items) { item in
                    ThemeSwatch(item: item, on: item.id == theme.current) { onPick(item) }
                }
            }
            if let label = theme.tryLive {
                Button(action: onTryLive) {
                    HStack(spacing: 8) {
                        Text(label)
                            .font(AppFont.font(14, 600))
                        SolarIcon("alt-arrow-right-linear", 16)
                            .foregroundColor(ink(0.7))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .contentShape(Capsule())
                    .modifier(WebGlass(shape: Capsule()))
                }
                .buttonStyle(PressStyle())
            }
        }
    }
}

/// A small version of a theme's backdrop with a pane of glass and two lines
/// of "text" on it, as the theme draws them (components/theme/theme-picker.tsx).
private struct ThemeSwatch: View {
    let item: AccountState.Theme.Item
    let on: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 6) {
                Color.clear
                    .aspectRatio(3.0 / 4.0, contentMode: .fit)
                    .overlay(ThemeBackdrop(item: item))
                    .overlay(pane)
                    .overlay(alignment: .topTrailing) {
                        if item.premium {
                            SolarIcon("crown-bold", 12)
                                .foregroundColor(Tw.yellow400)
                                .frame(width: 20, height: 20)
                                .background(Circle().fill(Color.black.opacity(0.45)))
                                .padding(4)
                        }
                    }
                    .overlay(alignment: .bottomTrailing) {
                        if on {
                            SolarIcon("check-read-linear", 13)
                                .foregroundColor(.black)
                                .frame(width: 20, height: 20)
                                .background(Circle().fill(Color.white))
                                .padding(4)
                        }
                    }
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .strokeBorder(on ? Color.white : Color.white.opacity(0.25), lineWidth: 2)
                    )
                    .background(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .inset(by: -3)
                            .fill(Color.white.opacity(on ? 0.25 : 0))
                    )
                    .scaleEffect(on ? 1.05 : 1)
                Text(item.name)
                    .font(AppFont.font(11, on ? 600 : 400))
                    .foregroundColor(ink(on ? 1 : 0.6))
                    .lineLimit(1)
            }
        }
        .buttonStyle(PressStyle())
        .animation(.easeOut(duration: 0.2), value: on)
    }

    private var pane: some View {
        GeometryReader { geo in
            let w = geo.size.width * 0.64
            let h = geo.size.height * 0.4
            ZStack(alignment: .topLeading) {
                RoundedRectangle(cornerRadius: 6, style: .continuous)
                    .fill(paneFill)
                    .overlay(RoundedRectangle(cornerRadius: 6, style: .continuous).strokeBorder(paneStroke, lineWidth: 1))
                Capsule()
                    .fill(item.light ? Color(hex: "#2a1710") : Color.white)
                    .frame(width: w * 0.52, height: max(2, h * 0.1))
                    .offset(x: w * 0.18, y: h * 0.28)
                Capsule()
                    .fill(item.light ? Color(hex: "#2a1710", opacity: 0.45) : Color.white.opacity(0.6))
                    .frame(width: w * 0.34, height: max(2, h * 0.08))
                    .offset(x: w * 0.18, y: h * 0.54)
            }
            .frame(width: w, height: h)
            .position(x: geo.size.width / 2, y: geo.size.height / 2)
        }
    }

    private var paneFill: Color {
        if item.light { return Color.white.opacity(0.55) }
        if item.chrome { return Color(hex: "#08090d") }
        return Color.white.opacity(0.14)
    }

    private var paneStroke: Color {
        if item.light { return Color(hex: "#2a1710", opacity: 0.12) }
        if item.chrome { return Color.white.opacity(0.55) }
        return Color.white.opacity(0.3)
    }
}

private struct ThemeBackdrop: View {
    let item: AccountState.Theme.Item

    var body: some View {
        if let path = item.image, let image = ThemeImages.load(path) {
            Image(uiImage: image)
                .resizable()
                .scaledToFill()
        } else {
            switch item.id {
            case "rose-glass":
                LinearGradient(gradient: Gradient(stops: [
                    .init(color: Color(hex: "#9f1239"), location: 0),
                    .init(color: Color(hex: "#f43f5e"), location: 0.45),
                    .init(color: Color(hex: "#fdba74"), location: 1),
                ]), startPoint: UnitPoint(x: 0.37, y: 0), endPoint: UnitPoint(x: 0.63, y: 1))
            case "paper":
                ZStack {
                    LinearGradient(colors: [Color(hex: "#fbf1e4"), Color(hex: "#f1d9c0")], startPoint: .top, endPoint: .bottom)
                    RadialGradient(colors: [Color(hex: "#fde1c4"), Color(hex: "#fde1c4", opacity: 0)],
                                   center: UnitPoint(x: 0.85, y: 0.1), startRadius: 0, endRadius: 60)
                    RadialGradient(colors: [Color(hex: "#f5c4a1"), Color(hex: "#f5c4a1", opacity: 0)],
                                   center: UnitPoint(x: 0.1, y: 0.9), startRadius: 0, endRadius: 70)
                }
            case "obsidian":
                ZStack {
                    Color(hex: "#05060a")
                    RadialGradient(colors: [Color(hex: "#8c9bd2", opacity: 0.3), Color.clear],
                                   center: UnitPoint(x: 0.5, y: -0.08), startRadius: 0, endRadius: 80)
                    RadialGradient(colors: [Color(hex: "#287896", opacity: 0.22), Color.clear],
                                   center: UnitPoint(x: 0, y: 1), startRadius: 0, endRadius: 70)
                    RadialGradient(colors: [Color(hex: "#6e46aa", opacity: 0.22), Color.clear],
                                   center: UnitPoint(x: 1, y: 0.85), startRadius: 0, endRadius: 70)
                }
            default:
                LinearGradient(colors: [Color(hex: "#4c1d95"), Color(hex: "#be185d")], startPoint: .top, endPoint: .bottom)
            }
        }
    }
}

private struct NotificationsCard: View {
    let notifications: AccountState.Notifications

    var body: some View {
        let on = notifications.on
        Card(horizontal: 16, vertical: 14) {
            HStack(spacing: 12) {
                SectionLabel(icon: "bell-bold", tint: on ? Tw.blue400 : ink(0.5),
                             title: notifications.title, desc: notifications.desc)
                Spacer(minLength: 8)
                Badge(
                    text: notifications.badge,
                    fill: on ? Tw.blue500.opacity(0.2) : ink(0.1),
                    stroke: on ? Tw.blue400.opacity(0.3) : ink(0.1),
                    textColor: on ? Tw.blue300 : ink(0.4)
                )
            }
            Button {
                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                if let url = URL(string: UIApplication.openNotificationSettingsURLString) {
                    UIApplication.shared.open(url)
                }
            } label: {
                HStack(spacing: 8) {
                    SolarIcon("settings-bold", 16)
                    Text(notifications.button)
                        .font(AppFont.font(14, 500))
                }
                .foregroundColor(Tw.blue300)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(Tw.blue500.opacity(0.2)))
                .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(Tw.blue400.opacity(0.3), lineWidth: 1))
            }
            .buttonStyle(PressStyle())
        }
    }
}

private struct LeaderboardCard: View {
    let board: AccountState.Leaderboard
    let onToggle: (Bool) -> Void

    var body: some View {
        Card(horizontal: 16, vertical: 14) {
            HStack(spacing: 12) {
                SectionLabel(icon: "users-group-rounded-bold", tint: board.on ? Tw.yellow400 : ink(0.5),
                             title: board.title, desc: board.desc, descSize: 11, descOpacity: 0.4)
                Spacer(minLength: 8)
                WebSwitch(on: board.on) { onToggle(!board.on) }
            }
        }
    }
}

/// The web sheet's own switch: 44 × 24, a blue track when on.
private struct WebSwitch: View {
    let on: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack(alignment: on ? .trailing : .leading) {
                Capsule()
                    .fill(on ? Tw.blue500 : Color.black.opacity(0.3))
                    .overlay(Capsule().strokeBorder(on ? Color.clear : ink(0.2), lineWidth: 1))
                Circle()
                    .fill(Color.white)
                    .frame(width: 20, height: 20)
                    .shadow(color: Color.black.opacity(0.2), radius: 1.5, x: 0, y: 1)
                    .padding(2)
            }
            .frame(width: 44, height: 24)
            .animation(.easeInOut(duration: 0.3), value: on)
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(on ? .isSelected : [])
    }
}

private struct WidgetCard: View {
    let widget: AccountState.Widget
    let onSource: (String) -> Void
    let onAdd: () -> Void

    @State private var showHowTo = false

    private var sourceName: String {
        widget.options.first { $0.value == widget.source }?.label ?? widget.options.first?.label ?? ""
    }

    var body: some View {
        Card {
            HStack(spacing: 12) {
                SectionLabel(icon: "widget-5-bold", tint: widget.added ? Tw.orange400 : ink(0.5),
                             title: widget.title, desc: widget.desc)
                Spacer(minLength: 8)
                if widget.added {
                    Badge(text: widget.addedLabel, fill: Tw.orange500.opacity(0.2),
                          stroke: Tw.orange400.opacity(0.3), textColor: Tw.orange300)
                }
            }

            HStack(spacing: 12) {
                Text(widget.sourceLabel)
                    .font(AppFont.font(12))
                    .foregroundColor(ink(0.7))
                    .fixedSize()
                Menu {
                    Picker(widget.sourceLabel, selection: Binding(get: { widget.source }, set: { onSource($0) })) {
                        ForEach(widget.options, id: \.value) { option in
                            Text(option.label).tag(option.value)
                        }
                    }
                } label: {
                    HStack {
                        Text(sourceName)
                            .font(AppFont.font(14, 500))
                            .foregroundColor(ink())
                            .lineLimit(1)
                        Spacer(minLength: 4)
                        SolarIcon("alt-arrow-down-linear", 16)
                            .foregroundColor(ink(0.6))
                    }
                    .padding(.leading, 16)
                    .padding(.trailing, 12)
                    .padding(.vertical, 8)
                    .background(Capsule().fill(ink(0.1)))
                    .overlay(Capsule().strokeBorder(ink(0.2), lineWidth: 1))
                }
            }

            if let status = widget.status {
                Text(status)
                    .font(AppFont.font(12))
                    .foregroundColor(widget.statusFailed ? Tw.red300 : ink(0.5))
            }

            if let add = widget.addButton {
                Button(action: onAdd) {
                    HStack(spacing: 8) {
                        SolarIcon("add-square-bold", 16)
                        Text(add)
                            .font(AppFont.font(14, 600))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(Capsule().fill(LinearGradient(colors: [Tw.orange500, Tw.amber500],
                                                              startPoint: .leading, endPoint: .trailing)))
                }
                .buttonStyle(PressStyle())
            }

            Button {
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) { showHowTo.toggle() }
            } label: {
                HStack {
                    Text(widget.howToTitle)
                        .font(AppFont.font(12, 500))
                    Spacer()
                    SolarIcon(showHowTo ? "alt-arrow-up-linear" : "alt-arrow-down-linear", 14)
                }
                .foregroundColor(ink(0.7))
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            if showHowTo {
                VStack(alignment: .leading, spacing: 6) {
                    ForEach(Array(widget.steps.enumerated()), id: \.offset) { index, step in
                        HStack(alignment: .firstTextBaseline, spacing: 6) {
                            Text("\(index + 1).")
                                .monospacedDigit()
                            Text(step)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .font(AppFont.font(12))
                        .foregroundColor(ink(0.6))
                    }
                }
                .padding(.leading, 4)
                .transition(.opacity)
            }
        }
    }
}

private struct OfflineCard: View {
    let offline: AccountState.Offline
    let images: [String: UIImage]
    let onAction: (String, String) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 10) {
                SolarIcon(offline.done ? "cloud-check-bold" : "cloud-download-bold", 18)
                    .foregroundColor(offline.done ? Tw.emerald400 : ink(0.5))
                Text(offline.title)
                    .font(AppFont.font(14, 500))
            }
            ForEach(Array(offline.rows.enumerated()), id: \.element.id) { index, row in
                if index > 0 {
                    Rectangle()
                        .fill(ink(0.1))
                        .frame(height: 1)
                }
                OfflineRowView(row: row, images: images) { action in onAction(action, row.id) }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 16)
        .padding(.top, 12)
        .padding(.bottom, 4)
        .modifier(CardSurface())
    }
}

private struct OfflineRowView: View {
    let row: AccountState.Offline.Row
    let images: [String: UIImage]
    let onAction: (String) -> Void

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 10) {
                HStack(spacing: 6) {
                    Flag(image: row.flags.first.flatMap { images[$0] })
                    SolarIcon("arrow-right-linear", 13)
                        .foregroundColor(ink(0.4))
                    Flag(image: row.flags.count > 1 ? images[row.flags[1]] : nil)
                }
                VStack(alignment: .leading, spacing: 0) {
                    Text(row.title)
                        .font(AppFont.font(14, 500))
                        .lineLimit(1)
                    Text(row.subtitle)
                        .font(AppFont.font(11).monospacedDigit())
                        .foregroundColor(toneColor)
                        .lineLimit(1)
                }
                Spacer(minLength: 6)
                HStack(spacing: 6) {
                    ForEach(row.actions) { action in
                        actionButton(action)
                    }
                }
            }
            if let percent = row.percent {
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Capsule().fill(ink(0.1))
                        Capsule()
                            .fill(row.active
                                  ? AnyShapeStyle(LinearGradient(colors: [Tw.blue400, Tw.violet400],
                                                                 startPoint: .leading, endPoint: .trailing))
                                  : AnyShapeStyle(ink(0.3)))
                            .frame(width: geo.size.width * CGFloat(max(2, min(percent, 100)) / 100))
                    }
                }
                .frame(height: 4)
                .padding(.top, 8)
                .animation(.easeOut(duration: 0.3), value: percent)
            }
        }
        .padding(.vertical, 10)
    }

    private var toneColor: Color {
        switch row.tone {
        case "good": return Tw.emerald300.opacity(0.8)
        case "warn": return Tw.yellow300.opacity(0.8)
        case "bad": return Tw.red400.opacity(0.9)
        default: return ink(0.45)
        }
    }

    @ViewBuilder
    private func actionButton(_ action: AccountState.Offline.Action) -> some View {
        // Haptics come from the web side's offline rules (useOfflinePacks).
        let tap: () -> Void = { onAction(action.id) }
        switch action.id {
        case "download":
            PillButton(label: action.label ?? "", icon: "download-minimalistic-bold", textColor: Tw.blue300,
                       fill: Tw.blue500.opacity(0.2), stroke: Tw.blue400.opacity(0.3), action: tap)
                .disabled(action.disabled)
                .opacity(action.disabled ? 0.4 : 1)
        case "anyway":
            PillButton(label: action.label ?? "", icon: nil, textColor: Tw.yellow300,
                       fill: Tw.yellow500.opacity(0.2), stroke: Tw.yellow400.opacity(0.3), action: tap)
        case "confirm":
            PillButton(label: action.label ?? "", icon: nil, textColor: .white,
                       fill: Tw.red500.opacity(0.8), stroke: Tw.red400, action: tap)
        default:
            RoundButton(icon: Self.icon(for: action.id), iconSize: action.id == "remove" || action.id == "cancel" ? 14 : 13,
                        tint: action.id == "resume" ? Tw.blue300 : ink(0.7), action: tap)
                .disabled(action.disabled)
                .opacity(action.disabled ? 0.4 : 1)
        }
    }

    private static func icon(for action: String) -> String {
        switch action {
        case "pause": return "pause-bold"
        case "resume": return "play-bold"
        case "remove": return "trash-bin-trash-bold"
        default: return "close-circle-bold"
        }
    }
}

/// A round flag, drawn by the web side from its own flag set.
private struct Flag: View {
    let image: UIImage?

    var body: some View {
        ZStack {
            if let image {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
            } else {
                ink(0.1)
            }
        }
        .frame(width: 24, height: 24)
        .clipShape(Circle())
        .overlay(Circle().strokeBorder(ink(0.2), lineWidth: 1))
    }
}

private struct PillButton: View {
    let label: String
    let icon: String?
    let textColor: Color
    let fill: Color
    let stroke: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                if let icon {
                    SolarIcon(icon, 14)
                }
                Text(label)
                    .font(AppFont.font(12, 500))
                    .lineLimit(1)
            }
            .foregroundColor(textColor)
            .padding(.horizontal, 12)
            .frame(height: 32)
            .background(Capsule().fill(fill))
            .overlay(Capsule().strokeBorder(stroke, lineWidth: 1))
        }
        .buttonStyle(PressStyle())
    }
}

/// The round 32 pt buttons in a download row: glass controls on the web skin.
private struct RoundButton: View {
    let icon: String
    let iconSize: CGFloat
    let tint: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            SolarIcon(icon, iconSize)
                .foregroundColor(tint)
                .frame(width: 32, height: 32)
                .contentShape(Circle())
                .modifier(WebGlass(shape: Circle()))
        }
        .buttonStyle(PressStyle())
    }
}

/// Manage Subscription, Delete Account, Sign Out: glass controls on the web skin.
private struct AccountButton: View {
    let icon: String
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                SolarIcon(icon, 18)
                Text(title)
                    .font(AppFont.font(14, 500))
            }
            .foregroundColor(ink())
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .padding(.horizontal, 16)
            .contentShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .modifier(WebGlass(shape: RoundedRectangle(cornerRadius: 16, style: .continuous)))
        }
        .buttonStyle(PressStyle())
    }
}

// ── Delete account ───────────────────────────────────────────────────────────

private struct DeleteConfirmView: View {
    let delete: AccountState.Delete
    let onCancel: () -> Void
    let onConfirm: () -> Void

    @State private var typed = ""
    @FocusState private var focused: Bool

    private var canDelete: Bool {
        !delete.busy && typed.trimmingCharacters(in: .whitespaces).lowercased() == delete.word.lowercased()
    }

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 16) {
                Text(delete.title)
                    .font(AppFont.font(18, 700))
                    .multilineTextAlignment(.center)

                if let warning = delete.warning {
                    markup(warning)
                        .font(AppFont.font(12))
                        .foregroundColor(Tw.yellow300)
                        .multilineTextAlignment(.center)
                        .lineSpacing(3)
                        .padding(12)
                        .frame(maxWidth: .infinity)
                        .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(Tw.yellow500.opacity(0.1)))
                        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder(Tw.yellow400.opacity(0.3), lineWidth: 1))
                }

                Text(delete.permanent)
                    .font(AppFont.font(12))
                    .foregroundColor(ink(0.6))
                    .multilineTextAlignment(.center)
                    .lineSpacing(3)

                VStack(spacing: 6) {
                    markup(delete.hint)
                        .font(AppFont.font(12))
                        .foregroundColor(ink(0.5))
                    TextField(delete.word, text: $typed)
                        .textInputAutocapitalization(.never)
                        .disableAutocorrection(true)
                        .multilineTextAlignment(.center)
                        .font(AppFont.font(16))
                        .focused($focused)
                        .padding(.vertical, 10)
                        .padding(.horizontal, 12)
                        .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(ink(0.05)))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .strokeBorder(focused ? Tw.red400.opacity(0.6) : ink(0.2), lineWidth: 1)
                        )
                        .disabled(delete.busy)
                        .opacity(delete.busy ? 0.4 : 1)
                }

                if let error = delete.error {
                    Text(error)
                        .font(AppFont.font(12))
                        .foregroundColor(Tw.red400)
                        .multilineTextAlignment(.center)
                }

                HStack(spacing: 12) {
                    Button {
                        focused = false
                        onCancel()
                    } label: {
                        Text(delete.cancel)
                            .font(AppFont.font(14, 500))
                            .foregroundColor(ink(0.7))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(ink(0.1)))
                            .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder(ink(0.2), lineWidth: 1))
                    }
                    .buttonStyle(PressStyle())
                    .disabled(delete.busy)
                    .opacity(delete.busy ? 0.4 : 1)

                    Button {
                        focused = false
                        onConfirm()
                    } label: {
                        Text(delete.busy ? delete.deleting : delete.confirm)
                            .font(AppFont.font(14, 500))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(Tw.red500.opacity(0.8)))
                    }
                    .buttonStyle(PressStyle())
                    .disabled(!canDelete)
                    .opacity(canDelete ? 1 : 0.4)
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 32)
        }
    }
}

/// Text with the translations' <b>…</b> made bold.
private func markup(_ source: String) -> Text {
    var result = Text(verbatim: "")
    var rest = Substring(source)
    while let open = rest.range(of: "<b>") {
        result = result + Text(verbatim: String(rest[..<open.lowerBound]))
        let after = rest[open.upperBound...]
        guard let close = after.range(of: "</b>") else {
            rest = after
            break
        }
        result = result + Text(verbatim: String(after[..<close.lowerBound])).bold()
        rest = after[close.upperBound...]
    }
    return result + Text(verbatim: String(rest))
}

// ── Glass ────────────────────────────────────────────────────────────────────

/// The web skin's sheet corner (--lg-radius-sheet).
let sheetCornerRadius: CGFloat = 38

/// The whole sheet as the web draws it (manage-account-modal.tsx under
/// app/liquid-glass.css): the page dimmed and blurred behind it, the panel
/// inset 8 pt from the screen's edges with 38 pt corners, its glass made from
/// the page with the web's own CSS numbers (SheetGlass), a white wash, a sheen
/// and a lit rim. It opens out of the button it came from, the glass growing
/// from the button while the contents stay still (as lib/morph-modal.ts does),
/// or slides up; dragged down by its top, it slides away.
struct AccountSheetHost: View {
    @ObservedObject var model: AccountSheetModel
    /// The button it opened from, in screen points.
    let source: CGRect?

    @State private var open = false
    @State private var drag: CGFloat = 0
    @State private var leaving = false
    @State private var dragMode = DragMode.undecided

    private enum DragMode {
        case undecided, sheet, ignored
    }

    /// The web sheet's height: its 78 pt header over a scroller capped at 75%
    /// of the screen, and never over 85% (795 pt on a Pro Max).
    static func panelFrame(in screen: CGSize) -> CGRect {
        let height = min(screen.height * 0.75 + 78, screen.height * 0.85)
        return CGRect(x: 8, y: screen.height - 8 - height, width: screen.width - 16, height: height)
    }

    var body: some View {
        GeometryReader { geo in
            let screen = geo.size
            let panel = Self.panelFrame(in: screen)
            ZStack(alignment: .topLeading) {
                backdrop(screen)
                panelView(panel, screen: screen)
            }
            .frame(width: screen.width, height: screen.height, alignment: .topLeading)
        }
        .ignoresSafeArea()
        .onAppear {
            model.onAppear()
            DispatchQueue.main.async {
                withAnimation(.spring(response: 0.55, dampingFraction: 0.84)) { open = true }
            }
        }
        .onChange(of: model.closing) { closing in
            if closing { animateAway() }
        }
    }

    // The page behind, dimmed as the web sheet's backdrop does it (bg-black/50),
    // and live, so a theme changes in front of the user; a tap closes the sheet.
    private func backdrop(_ screen: CGSize) -> some View {
        let fade = 1 - min(max(drag, 0) / 400, 1)
        return Color.black.opacity(0.5)
            .frame(width: screen.width, height: screen.height)
            .opacity(open && !leaving ? fade : 0)
            .contentShape(Rectangle())
            .onTapGesture { model.close() }
    }

    private func panelView(_ panel: CGRect, screen: CGSize) -> some View {
        let whole = CGRect(origin: .zero, size: panel.size)
        let start = source.map { $0.offsetBy(dx: -panel.minX, dy: -panel.minY) }
        let shape = MorphShape(
            progress: open ? 1 : 0,
            from: start ?? whole,
            to: whole,
            fromRadius: start.map { min($0.width, $0.height) / 2 } ?? sheetCornerRadius,
            toRadius: sheetCornerRadius
        )
        // Without a button to open from, it slides up from below instead.
        let slide: CGFloat = (start == nil && !open) ? panel.height + 16 : 0
        let shift = slide + drag
        return ZStack(alignment: .top) {
            surface(panel, screen: screen, shift: shift)
            AccountSheetView(model: model)
                .opacity(open ? 1 : 0)
        }
        .frame(width: panel.width, height: panel.height)
        // Before the offset, so the drag's points are the panel's own.
        .simultaneousGesture(dragToClose(panel))
        .clipShape(shape)
        .overlay(shape.stroke(Self.rim, lineWidth: 1.5).allowsHitTesting(false))
        .offset(x: panel.minX, y: panel.minY + shift)
    }

    /// The glass: what the web's CSS makes of the page behind (fixed to the
    /// screen as the panel moves, as real glass would be), a 10% white wash
    /// and a sheen lit from the top left.
    private func surface(_ panel: CGRect, screen: CGSize, shift: CGFloat) -> some View {
        Color.clear
            .frame(width: panel.width, height: panel.height)
            .overlay(alignment: .topLeading) {
                if let glass = model.glass {
                    Image(uiImage: glass.sheet)
                        .resizable()
                        .frame(width: screen.width, height: screen.height)
                        .offset(x: -panel.minX, y: -(panel.minY + shift))
                } else {
                    // Reduce Transparency: the web sheet goes solid (--lg-solid).
                    Color(red: 52 / 255, green: 30 / 255, blue: 22 / 255)
                }
            }
            .overlay(Color.white.opacity(0.1))
            .overlay(LinearGradient(gradient: Gradient(stops: [
                .init(color: Color.white.opacity(0.14), location: 0),
                .init(color: Color.white.opacity(0.03), location: 0.28),
                .init(color: Color.white.opacity(0), location: 0.55),
                .init(color: Color.white.opacity(0.05), location: 1),
            ]), startPoint: UnitPoint(x: 0.33, y: 0), endPoint: UnitPoint(x: 0.67, y: 1)))
    }

    /// The light-catching rim round the web sheet's edge.
    private static let rim = LinearGradient(gradient: Gradient(stops: [
        .init(color: Color.white.opacity(0.7), location: 0),
        .init(color: Color.white.opacity(0.25), location: 0.12),
        .init(color: Color.white.opacity(0.06), location: 0.3),
        .init(color: Color.white.opacity(0.04), location: 0.7),
        .init(color: Color.white.opacity(0.18), location: 0.88),
        .init(color: Color.white.opacity(0.45), location: 1),
    ]), startPoint: .topLeading, endPoint: .bottomTrailing)

    /// As the web sheet: dragged down by its handle and header, or anywhere
    /// once its contents are scrolled to the top, it follows the finger (the
    /// contents hold still meanwhile); let go far or fast enough, it slides
    /// away. Upwards it only gives a little.
    private func dragToClose(_ panel: CGRect) -> some Gesture {
        DragGesture(minimumDistance: 6)
            .onChanged { value in
                guard !leaving else { return }
                if dragMode == .undecided {
                    let fromTop = value.startLocation.y < 80
                    let downwards = value.translation.height > abs(value.translation.width)
                    let atTop = (model.scrollView?.contentOffset.y ?? 0) <= 0.5
                    dragMode = fromTop || (downwards && atTop) ? .sheet : .ignored
                    if dragMode == .sheet { model.scrollView?.isScrollEnabled = false }
                }
                guard dragMode == .sheet else { return }
                let dy = value.translation.height
                drag = dy < 0 ? dy * 0.15 : dy
            }
            .onEnded { value in
                let wasSheet = dragMode == .sheet
                dragMode = .undecided
                model.scrollView?.isScrollEnabled = true
                guard !leaving, wasSheet else { return }
                let dy = value.translation.height
                let flick = value.predictedEndTranslation.height - dy
                if dy > 100 || flick > 120 {
                    slideAway(panel)
                } else {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) { drag = 0 }
                }
            }
    }

    private func slideAway(_ panel: CGRect) {
        leaving = true
        let duration = 0.3
        withAnimation(.easeOut(duration: duration)) { drag = panel.height + 40 }
        DispatchQueue.main.asyncAfter(deadline: .now() + duration) { model.onFinished() }
    }

    /// Back into the button it opened from (or down, without one).
    private func animateAway() {
        guard !leaving else { return }
        leaving = true
        let duration = 0.42
        withAnimation(.easeInOut(duration: duration)) { open = false }
        DispatchQueue.main.asyncAfter(deadline: .now() + duration) { model.onFinished() }
    }
}

/// A rounded rectangle on its way from one frame to another: from the button
/// to the whole panel as `progress` goes from 0 to 1. (Also the web pop-ups'
/// glass in PanelMorphView.)
struct MorphShape: Shape {
    var progress: CGFloat
    let from: CGRect
    let to: CGRect
    let fromRadius: CGFloat
    let toRadius: CGFloat

    var animatableData: CGFloat {
        get { progress }
        set { progress = newValue }
    }

    func path(in _: CGRect) -> Path {
        let p = min(max(progress, 0), 1.02)
        let x = from.minX + (to.minX - from.minX) * p
        let y = from.minY + (to.minY - from.minY) * p
        let width = from.width + (to.width - from.width) * p
        let height = from.height + (to.height - from.height) * p
        let corner = fromRadius + (toRadius - fromRadius) * p
        let rect = CGRect(x: x, y: y, width: max(width, 1), height: max(height, 1))
        return Path(roundedRect: rect, cornerRadius: min(corner, min(rect.width, rect.height) / 2), style: .continuous)
    }
}

/// The web cards: a 10% white wash with a 15% white edge, 16 pt corners.
private struct CardSurface: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(ink(0.1)))
            .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder(ink(0.15), lineWidth: 1))
    }
}

/// The web skin's glass controls (app/liquid-glass.css): a frosted 10% white
/// fill, a lit body, a light-catching rim and a soft lift.
private struct WebGlass<S: InsettableShape>: ViewModifier {
    let shape: S

    private static var rim: LinearGradient {
        LinearGradient(gradient: Gradient(stops: [
            .init(color: Color.white.opacity(0.95), location: 0),
            .init(color: Color.white.opacity(0.5), location: 0.16),
            .init(color: Color.white.opacity(0.1), location: 0.38),
            .init(color: Color.white.opacity(0.06), location: 0.62),
            .init(color: Color.white.opacity(0.35), location: 0.84),
            .init(color: Color.white.opacity(0.8), location: 1),
        ]), startPoint: .topLeading, endPoint: .bottomTrailing)
    }

    private static var lit: LinearGradient {
        LinearGradient(gradient: Gradient(stops: [
            .init(color: Color.white.opacity(0.22), location: 0),
            .init(color: Color.white.opacity(0.06), location: 0.42),
            .init(color: Color.white.opacity(0), location: 0.62),
            .init(color: Color.white.opacity(0.1), location: 1),
        ]), startPoint: .top, endPoint: .bottom)
    }

    func body(content: Content) -> some View {
        content
            .background(
                ZStack {
                    shape.fill(.ultraThinMaterial)
                    shape.fill(Color.white.opacity(0.1))
                    shape.fill(Self.lit)
                }
                .shadow(color: Color.black.opacity(0.16), radius: 11, x: 0, y: 8)
            )
            .overlay(shape.strokeBorder(Self.rim, lineWidth: 1.5))
    }
}

/// Finds the UIKit scroller under a SwiftUI ScrollView. Like the web sheet's
/// (overscroll-behavior: none) it doesn't bounce, and the drag to close needs
/// to know when it is at the top.
private struct ScrollViewFinder: UIViewRepresentable {
    let found: (UIScrollView) -> Void

    func makeUIView(context: Context) -> FinderView {
        FinderView(found: found)
    }

    func updateUIView(_ view: FinderView, context: Context) {}

    final class FinderView: UIView {
        private let found: (UIScrollView) -> Void

        init(found: @escaping (UIScrollView) -> Void) {
            self.found = found
            super.init(frame: .zero)
            isUserInteractionEnabled = false
        }

        required init?(coder: NSCoder) {
            return nil
        }

        override func didMoveToWindow() {
            super.didMoveToWindow()
            var view = superview
            while let current = view {
                if let scroll = current as? UIScrollView {
                    scroll.bounces = false
                    found(scroll)
                    return
                }
                view = current.superview
            }
        }
    }
}

/// A gentle press: the control dips a little under the finger.
private struct PressStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(.spring(response: 0.25, dampingFraction: 0.7), value: configuration.isPressed)
    }
}
