import SwiftUI
import UIKit

// Manage Account, drawn natively: the same cards as the web sheet
// (components/account/manage-account-modal.tsx), in the same order, with the
// state and rules coming from the web side (AccountSheetState.swift). On iOS 26
// the sheet itself and its buttons are Liquid Glass; before that, a material.

struct AccountSheetView: View {
    @ObservedObject var model: AccountSheetModel
    @State private var confirmingDelete = false

    var body: some View {
        VStack(spacing: 0) {
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
        .background(SheetBackdrop())
    }

    private var header: some View {
        HStack {
            Text(model.state.title)
                .font(.system(size: 20, weight: .bold))
            Spacer()
            Button {
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                model.onClose()
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(.primary)
                    .frame(width: 38, height: 38)
                    .contentShape(Circle())
                    .glassBackground(Circle())
            }
            .buttonStyle(PressStyle())
            .accessibilityLabel(Text(model.state.closeLabel))
        }
        .padding(.horizontal, 20)
        .padding(.top, 22)
        .padding(.bottom, 12)
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
                        premium: s.subscription.premium,
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
                        OfflineCard(offline: offline) { action, id in
                            model.send("offline", "\(action):\(id)")
                        }
                        .id("offline")
                    }

                    Rectangle()
                        .fill(Color.primary.opacity(0.1))
                        .frame(height: 1)
                        .padding(.vertical, 4)

                    VStack(spacing: 12) {
                        AccountButton(icon: "gearshape.fill", title: s.buttons.manageSubscription) {
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                            model.onManageSubscriptions()
                        }
                        AccountButton(icon: "trash.fill", title: s.buttons.deleteAccount) {
                            UINotificationFeedbackGenerator().notificationOccurred(.warning)
                            withAnimation(.spring(response: 0.4, dampingFraction: 0.86)) { confirmingDelete = true }
                        }
                        AccountButton(icon: "rectangle.portrait.and.arrow.right", title: s.buttons.signOut) {
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                            model.send("signOut")
                        }
                    }
                    .id("buttons")
                }
                .padding(.horizontal, 16)
                .padding(.top, 4)
                .padding(.bottom, 32)
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
/// in a row: tap one to wear it for a moment.
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
                .padding(.vertical, 14)

                VStack(alignment: .leading, spacing: 2) {
                    Text(profile.name)
                        .font(.system(size: 16, weight: .semibold))
                        .lineLimit(1)
                    if let email = profile.email, !email.isEmpty, email != profile.name {
                        Text(email)
                            .font(.system(size: 12))
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }
                    HStack(spacing: 4) {
                        ShinyText(text: shown.title, color: color, accent: accent)
                        if preview != nil {
                            Text("· \(level.previewLabel)")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(.secondary)
                                .lineLimit(1)
                        }
                    }
                    .padding(.top, 4)
                }
                Spacer(minLength: 0)
            }
            .padding(.top, 8)
            .padding(.horizontal, 8)

            VStack(alignment: .leading, spacing: 6) {
                HStack(alignment: .firstTextBaseline) {
                    Text(level.levelLabel)
                        .font(.system(size: 14, weight: .bold))
                    Spacer()
                    Text(level.xpLabel)
                        .font(.system(size: 12).monospacedDigit())
                        .foregroundColor(.secondary)
                }
                XPBar(progress: fill, color: Color(hex: earned.color), accent: Color(hex: earned.accent))
                if let hint = level.hint {
                    Text(hint)
                        .font(.system(size: 11))
                        .foregroundColor(.secondary)
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 16)

            Rectangle()
                .fill(Color.primary.opacity(0.1))
                .frame(height: 1)

            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 6) {
                    Image(systemName: "medal.fill")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.secondary)
                    Text(level.bordersLabel)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(Color.primary.opacity(0.75))
                    Text("\(ownedCount)/\(level.ranks.count)")
                        .font(.system(size: 12).monospacedDigit())
                        .foregroundColor(.secondary)
                }
                .padding(.horizontal, 16)
                gallery(shownId: shown.id)
            }
            .padding(.vertical, 12)
        }
        .background(RoundedRectangle(cornerRadius: 22, style: .continuous).fill(Color.primary.opacity(0.07)))
        .overlay(RoundedRectangle(cornerRadius: 22, style: .continuous).strokeBorder(Color.primary.opacity(0.12), lineWidth: 1))
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
                                    Image(systemName: "lock.fill")
                                        .font(.system(size: 13, weight: .bold))
                                        .foregroundColor(.white)
                                        .shadow(color: .black.opacity(0.6), radius: 2)
                                }
                            }
                            .frame(width: 40, height: 40)
                            Text(rank.unlockLabel)
                                .font(.system(size: 10))
                                .foregroundColor(rank.owned ? Color.primary.opacity(0.8) : Color.secondary)
                                .lineLimit(1)
                        }
                        .frame(width: 68)
                        .padding(.vertical, 8)
                        .background(
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .fill(Color.primary.opacity(active ? 0.1 : 0))
                        )
                    }
                    .buttonStyle(PressStyle())
                    .accessibilityLabel(Text(rank.title))
                }
            }
            .padding(.horizontal, 12)
            .padding(.top, 14)
            .padding(.bottom, 2)
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
                    .shadow(color: color.opacity(0.8), radius: 5)
            }
        }
        .frame(height: 10)
        .overlay(Capsule().strokeBorder(Color.white.opacity(0.1), lineWidth: 1))
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

/// The rank title, with light running through it in the rank's colours.
private struct ShinyText: View {
    let text: String
    let color: Color
    let accent: Color

    var body: some View {
        TimelineView(.animation) { context in
            let p = CGFloat(cyclePosition(context.date.timeIntervalSinceReferenceDate, 2.5)) * 2
            Text(text)
                .font(.system(size: 14, weight: .heavy))
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
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: spacing) {
            content
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(RoundedRectangle(cornerRadius: 22, style: .continuous).fill(Color.primary.opacity(0.07)))
        .overlay(RoundedRectangle(cornerRadius: 22, style: .continuous).strokeBorder(Color.primary.opacity(0.12), lineWidth: 1))
    }
}

private struct SectionLabel: View {
    let icon: String
    let tint: Color
    let title: String
    var desc: String? = nil

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(tint)
                .frame(width: 22)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 14, weight: .medium))
                if let desc {
                    Text(desc)
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
    }
}

private struct Badge: View {
    let text: String
    let fill: Color
    let stroke: Color
    let ink: Color

    var body: some View {
        Text(text)
            .font(.system(size: 12, weight: .semibold))
            .foregroundColor(ink)
            .lineLimit(1)
            .padding(.horizontal, 10)
            .padding(.vertical, 3)
            .background(Capsule().fill(fill))
            .overlay(Capsule().strokeBorder(stroke, lineWidth: 1))
    }
}

private struct SubscriptionCard: View {
    let subscription: AccountState.Subscription

    var body: some View {
        Card(spacing: 6) {
            HStack {
                SectionLabel(icon: "crown.fill", tint: Color(hex: "#facc15"), title: subscription.title)
                Spacer()
                if subscription.premium {
                    Text(subscription.badge)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 3)
                        .background(Capsule().fill(LinearGradient(colors: [Color(hex: "#eab308"), Color(hex: "#f97316")],
                                                                  startPoint: .leading, endPoint: .trailing)))
                } else {
                    Badge(text: subscription.badge, fill: Color.primary.opacity(0.1), stroke: Color.primary.opacity(0.2), ink: .secondary)
                }
            }
            ForEach(subscription.lines, id: \.self) { line in
                Text(line)
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)
            }
        }
    }
}

private struct ThemeCard: View {
    let theme: AccountState.Theme
    let premium: Bool
    let onPick: (AccountState.Theme.Item) -> Void
    let onTryLive: () -> Void

    var body: some View {
        Card {
            SectionLabel(icon: "paintpalette.fill", tint: .secondary, title: theme.title, desc: theme.desc)
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 3), spacing: 12) {
                ForEach(theme.items) { item in
                    ThemeSwatch(item: item, on: item.id == theme.current) { onPick(item) }
                }
            }
            if let label = theme.tryLive {
                Button(action: onTryLive) {
                    HStack(spacing: 8) {
                        Text(label)
                            .font(.system(size: 14, weight: .semibold))
                        Image(systemName: "chevron.right")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 11)
                    .contentShape(Capsule())
                    .glassBackground(Capsule())
                }
                .buttonStyle(PressStyle())
            }
        }
    }
}

/// A small version of a theme's backdrop with a pane of glass and two lines
/// of "text" on it, as the theme draws them.
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
                            Image(systemName: "crown.fill")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(Color(hex: "#facc15"))
                                .frame(width: 20, height: 20)
                                .background(Circle().fill(Color.black.opacity(0.45)))
                                .padding(4)
                        }
                    }
                    .overlay(alignment: .bottomTrailing) {
                        if on {
                            Image(systemName: "checkmark")
                                .font(.system(size: 10, weight: .heavy))
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
                    .shadow(color: on ? Color.white.opacity(0.3) : Color.clear, radius: 4)
                    .scaleEffect(on ? 1.05 : 1)
                Text(item.name)
                    .font(.system(size: 11, weight: on ? .semibold : .regular))
                    .foregroundColor(on ? Color.primary : Color.secondary)
                    .lineLimit(1)
            }
        }
        .buttonStyle(PressStyle())
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: on)
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
        Card {
            HStack(spacing: 12) {
                SectionLabel(icon: "bell.fill", tint: on ? Color(hex: "#60a5fa") : .secondary,
                             title: notifications.title, desc: notifications.desc)
                Spacer(minLength: 8)
                Badge(
                    text: notifications.badge,
                    fill: on ? Color(hex: "#3b82f6", opacity: 0.2) : Color.primary.opacity(0.1),
                    stroke: on ? Color(hex: "#60a5fa", opacity: 0.3) : Color.primary.opacity(0.1),
                    ink: on ? Color(hex: "#93c5fd") : .secondary
                )
            }
            Button {
                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                if let url = URL(string: UIApplication.openNotificationSettingsURLString) {
                    UIApplication.shared.open(url)
                }
            } label: {
                Label(notifications.button, systemImage: "gearshape.fill")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(Color(hex: "#93c5fd"))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 11)
                    .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(Color(hex: "#3b82f6", opacity: 0.2)))
                    .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(Color(hex: "#60a5fa", opacity: 0.3), lineWidth: 1))
            }
            .buttonStyle(PressStyle())
        }
    }
}

private struct LeaderboardCard: View {
    let board: AccountState.Leaderboard
    let onToggle: (Bool) -> Void

    var body: some View {
        Card {
            Toggle(isOn: Binding(get: { board.on }, set: { onToggle($0) })) {
                SectionLabel(icon: "person.3.fill", tint: board.on ? Color(hex: "#facc15") : .secondary,
                             title: board.title, desc: board.desc)
            }
            .tint(Color(hex: "#3b82f6"))
        }
    }
}

private struct WidgetCard: View {
    let widget: AccountState.Widget
    let onSource: (String) -> Void
    let onAdd: () -> Void

    @State private var showHowTo = false

    var body: some View {
        Card {
            HStack(spacing: 12) {
                SectionLabel(icon: "square.grid.2x2.fill", tint: widget.added ? Color(hex: "#fb923c") : .secondary,
                             title: widget.title, desc: widget.desc)
                Spacer(minLength: 8)
                if widget.added {
                    Badge(text: widget.addedLabel, fill: Color(hex: "#f97316", opacity: 0.2),
                          stroke: Color(hex: "#fb923c", opacity: 0.3), ink: Color(hex: "#fdba74"))
                }
            }

            HStack(spacing: 12) {
                Text(widget.sourceLabel)
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)
                Spacer(minLength: 8)
                Picker(widget.sourceLabel, selection: Binding(get: { widget.source }, set: { onSource($0) })) {
                    ForEach(widget.options, id: \.value) { option in
                        Text(option.label).tag(option.value)
                    }
                }
                .pickerStyle(.menu)
                .tint(.primary)
            }

            if let status = widget.status {
                Text(status)
                    .font(.system(size: 12))
                    .foregroundColor(widget.statusFailed ? Color(hex: "#fca5a5") : .secondary)
            }

            if let add = widget.addButton {
                Button(action: onAdd) {
                    Label(add, systemImage: "plus.square.fill")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 11)
                        .background(Capsule().fill(LinearGradient(colors: [Color(hex: "#f97316"), Color(hex: "#f59e0b")],
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
                        .font(.system(size: 12, weight: .medium))
                    Spacer()
                    Image(systemName: "chevron.down")
                        .font(.system(size: 12, weight: .semibold))
                        .rotationEffect(.degrees(showHowTo ? 180 : 0))
                }
                .foregroundColor(.secondary)
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
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                    }
                }
                .transition(.opacity)
            }
        }
    }
}

private struct OfflineCard: View {
    let offline: AccountState.Offline
    let onAction: (String, String) -> Void

    var body: some View {
        Card(spacing: 0) {
            HStack(spacing: 10) {
                Image(systemName: offline.done ? "checkmark.icloud.fill" : "icloud.and.arrow.down.fill")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(offline.done ? Color(hex: "#34d399") : .secondary)
                    .frame(width: 22)
                Text(offline.title)
                    .font(.system(size: 14, weight: .medium))
            }
            .padding(.bottom, 4)
            ForEach(Array(offline.rows.enumerated()), id: \.element.id) { index, row in
                if index > 0 {
                    Rectangle()
                        .fill(Color.primary.opacity(0.1))
                        .frame(height: 1)
                }
                OfflineRowView(row: row) { action in onAction(action, row.id) }
            }
        }
    }
}

private struct OfflineRowView: View {
    let row: AccountState.Offline.Row
    let onAction: (String) -> Void

    var body: some View {
        VStack(spacing: 8) {
            HStack(spacing: 10) {
                HStack(spacing: 5) {
                    Flag(emoji: row.flags.first ?? "")
                    Image(systemName: "arrow.right")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundColor(.secondary)
                    Flag(emoji: row.flags.count > 1 ? row.flags[1] : "")
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text(row.title)
                        .font(.system(size: 14, weight: .medium))
                        .lineLimit(1)
                    Text(row.subtitle)
                        .font(.system(size: 11).monospacedDigit())
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
                        Capsule().fill(Color.primary.opacity(0.1))
                        Capsule()
                            .fill(row.active
                                  ? AnyShapeStyle(LinearGradient(colors: [Color(hex: "#60a5fa"), Color(hex: "#a78bfa")],
                                                                 startPoint: .leading, endPoint: .trailing))
                                  : AnyShapeStyle(Color.primary.opacity(0.3)))
                            .frame(width: geo.size.width * CGFloat(max(2, min(percent, 100)) / 100))
                    }
                }
                .frame(height: 4)
                .animation(.easeOut(duration: 0.3), value: percent)
            }
        }
        .padding(.vertical, 10)
    }

    private var toneColor: Color {
        switch row.tone {
        case "good": return Color(hex: "#6ee7b7", opacity: 0.85)
        case "warn": return Color(hex: "#fde047", opacity: 0.85)
        case "bad": return Color(hex: "#f87171")
        default: return .secondary
        }
    }

    @ViewBuilder
    private func actionButton(_ action: AccountState.Offline.Action) -> some View {
        // Haptics come from the web side's offline rules (useOfflinePacks).
        let tap: () -> Void = { onAction(action.id) }
        switch action.id {
        case "download":
            PillButton(label: action.label ?? "", icon: "arrow.down", ink: Color(hex: "#93c5fd"),
                       fill: Color(hex: "#3b82f6", opacity: 0.2), stroke: Color(hex: "#60a5fa", opacity: 0.3), action: tap)
                .disabled(action.disabled)
                .opacity(action.disabled ? 0.4 : 1)
        case "anyway":
            PillButton(label: action.label ?? "", icon: nil, ink: Color(hex: "#fde047"),
                       fill: Color(hex: "#eab308", opacity: 0.2), stroke: Color(hex: "#facc15", opacity: 0.3), action: tap)
        case "confirm":
            PillButton(label: action.label ?? "", icon: nil, ink: .white,
                       fill: Color(hex: "#ef4444", opacity: 0.8), stroke: Color(hex: "#f87171"), action: tap)
        default:
            RoundButton(icon: Self.icon(for: action.id),
                        ink: action.id == "resume" ? Color(hex: "#93c5fd") : .secondary,
                        action: tap)
                .disabled(action.disabled)
                .opacity(action.disabled ? 0.4 : 1)
        }
    }

    private static func icon(for action: String) -> String {
        switch action {
        case "pause": return "pause.fill"
        case "resume": return "play.fill"
        case "remove": return "trash.fill"
        default: return "xmark"
        }
    }
}

private struct Flag: View {
    let emoji: String

    var body: some View {
        Text(emoji)
            .font(.system(size: 30))
            .fixedSize()
            .frame(width: 24, height: 24)
            .clipShape(Circle())
            .overlay(Circle().strokeBorder(Color.primary.opacity(0.2), lineWidth: 1))
    }
}

private struct PillButton: View {
    let label: String
    let icon: String?
    let ink: Color
    let fill: Color
    let stroke: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 5) {
                if let icon {
                    Image(systemName: icon)
                        .font(.system(size: 11, weight: .bold))
                }
                Text(label)
                    .font(.system(size: 12, weight: .medium))
                    .lineLimit(1)
            }
            .foregroundColor(ink)
            .padding(.horizontal, 12)
            .frame(height: 32)
            .background(Capsule().fill(fill))
            .overlay(Capsule().strokeBorder(stroke, lineWidth: 1))
        }
        .buttonStyle(PressStyle())
    }
}

private struct RoundButton: View {
    let icon: String
    let ink: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(ink)
                .frame(width: 32, height: 32)
                .background(Circle().fill(Color.primary.opacity(0.1)))
                .overlay(Circle().strokeBorder(Color.primary.opacity(0.15), lineWidth: 1))
        }
        .buttonStyle(PressStyle())
    }
}

private struct AccountButton: View {
    let icon: String
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.system(size: 16, weight: .semibold))
                Text(title)
                    .font(.system(size: 14, weight: .medium))
            }
            .foregroundColor(.primary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 15)
            .contentShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            .glassBackground(RoundedRectangle(cornerRadius: 18, style: .continuous))
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
                    .font(.system(size: 18, weight: .bold))
                    .multilineTextAlignment(.center)

                if let warning = delete.warning {
                    markup(warning)
                        .font(.system(size: 12))
                        .foregroundColor(Color(hex: "#fde047"))
                        .multilineTextAlignment(.center)
                        .padding(12)
                        .frame(maxWidth: .infinity)
                        .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(Color(hex: "#eab308", opacity: 0.1)))
                        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder(Color(hex: "#facc15", opacity: 0.3), lineWidth: 1))
                }

                Text(delete.permanent)
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)

                VStack(spacing: 8) {
                    markup(delete.hint)
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                    TextField(delete.word, text: $typed)
                        .textInputAutocapitalization(.never)
                        .disableAutocorrection(true)
                        .multilineTextAlignment(.center)
                        .font(.system(size: 16))
                        .focused($focused)
                        .padding(.vertical, 11)
                        .padding(.horizontal, 12)
                        .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(Color.primary.opacity(0.06)))
                        .overlay(
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .strokeBorder(focused ? Color(hex: "#f87171", opacity: 0.6) : Color.primary.opacity(0.2), lineWidth: 1)
                        )
                        .disabled(delete.busy)
                }

                if let error = delete.error {
                    Text(error)
                        .font(.system(size: 12))
                        .foregroundColor(Color(hex: "#f87171"))
                        .multilineTextAlignment(.center)
                }

                HStack(spacing: 12) {
                    Button {
                        focused = false
                        onCancel()
                    } label: {
                        Text(delete.cancel)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.primary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .glassBackground(RoundedRectangle(cornerRadius: 18, style: .continuous))
                    }
                    .buttonStyle(PressStyle())
                    .disabled(delete.busy)

                    Button {
                        focused = false
                        onConfirm()
                    } label: {
                        Text(delete.busy ? delete.deleting : delete.confirm)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(
                                RoundedRectangle(cornerRadius: 18, style: .continuous)
                                    .fill(Color(hex: "#ef4444", opacity: canDelete ? 0.85 : 0.4))
                            )
                    }
                    .buttonStyle(PressStyle())
                    .disabled(!canDelete)
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 8)
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

private struct SheetBackdrop: View {
    var body: some View {
        if #available(iOS 26.0, *) {
            // The sheet's own Liquid Glass shows through.
            Color.clear
        } else {
            Rectangle()
                .fill(.ultraThinMaterial)
                .ignoresSafeArea()
        }
    }
}

private extension View {
    /// Liquid Glass that answers the finger on iOS 26; a soft fill and a
    /// hairline before it.
    func glassBackground<S: Shape>(_ shape: S) -> AnyView {
        #if compiler(>=6.2)
        if #available(iOS 26.0, *) {
            return AnyView(self.glassEffect(Glass.regular.interactive(), in: shape))
        }
        #endif
        return AnyView(
            self
                .background(shape.fill(Color.primary.opacity(0.1)))
                .overlay(shape.stroke(Color.primary.opacity(0.15), lineWidth: 1))
        )
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
