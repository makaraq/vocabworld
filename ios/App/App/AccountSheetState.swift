import SwiftUI
import UIKit
import ImageIO

// What the native account sheet shows. components/account/native-account-sheet.tsx
// builds it from the same hooks and rules the web sheet uses (so Android, which
// keeps the web sheet, stays in step) and sends it over as JSON. Every string
// arrives translated: this side only lays it out and animates it.

struct AccountState: Decodable, Equatable {
    var title: String
    var closeLabel: String
    /// Dark glass and white text: every theme but the light one (Paper).
    var dark: Bool
    var profile: Profile
    var level: Level
    var subscription: Subscription
    var theme: Theme
    var notifications: Notifications?
    var leaderboard: Leaderboard?
    var widget: Widget?
    var offline: Offline?
    var buttons: Buttons
    var delete: Delete

    struct Profile: Decodable, Equatable {
        var name: String
        var email: String?
        /// A PNG data URL (the generated smiley) or an https photo.
        var avatar: String?
        var initials: String
    }

    struct Level: Decodable, Equatable {
        var level: Int
        /// 0...1 through the current level.
        var progress: Double
        /// The border the level has earned (a rank id from lib/leveling).
        var rank: String
        var levelLabel: String
        var xpLabel: String
        var hint: String?
        var bordersLabel: String
        var previewLabel: String
        var ranks: [Rank]
    }

    struct Rank: Decodable, Equatable, Identifiable {
        var id: String
        var minLevel: Int
        var title: String
        var color: String
        var accent: String
        var owned: Bool
        var unlockLabel: String
    }

    struct Subscription: Decodable, Equatable {
        var title: String
        var premium: Bool
        var badge: String
        var lines: [String]
    }

    struct Theme: Decodable, Equatable {
        var title: String
        var desc: String
        var current: String
        var items: [Item]
        var tryLive: String?

        struct Item: Decodable, Equatable, Identifiable {
            var id: String
            var name: String
            var premium: Bool
            var light: Bool
            var chrome: Bool
            /// The photo behind a photo theme, as a path in the web files (public/).
            var image: String?
        }
    }

    struct Notifications: Decodable, Equatable {
        var title: String
        var desc: String
        var on: Bool
        var badge: String
        var button: String
    }

    struct Leaderboard: Decodable, Equatable {
        var title: String
        var desc: String
        var on: Bool
    }

    struct Widget: Decodable, Equatable {
        var title: String
        var desc: String
        var added: Bool
        var addedLabel: String
        var sourceLabel: String
        /// "random" or a topic id.
        var source: String
        var options: [Option]
        var status: String?
        var statusFailed: Bool
        var addButton: String?
        var howToTitle: String
        var steps: [String]

        struct Option: Decodable, Equatable, Hashable {
            var value: String
            var label: String
        }
    }

    struct Offline: Decodable, Equatable {
        var title: String
        var done: Bool
        var rows: [Row]

        struct Row: Decodable, Equatable, Identifiable {
            var id: String
            var flags: [String]
            var title: String
            var subtitle: String
            /// muted, good, warn or bad
            var tone: String
            /// Through the step running now, 0...100; nil hides the bar.
            var percent: Double?
            /// Downloading now: a coloured bar rather than a grey one.
            var active: Bool
            var actions: [Action]
        }

        struct Action: Decodable, Equatable, Identifiable {
            /// download, pause, resume, anyway, remove, cancel or confirm
            var id: String
            var label: String?
            var disabled: Bool
        }
    }

    struct Buttons: Decodable, Equatable {
        var manageSubscription: String
        var deleteAccount: String
        var signOut: String
    }

    struct Delete: Decodable, Equatable {
        var title: String
        var warning: String?
        var permanent: String
        /// "Type <b>delete</b> to confirm"
        var hint: String
        var word: String
        var cancel: String
        var confirm: String
        var deleting: String
        var busy: Bool
        var error: String?
    }
}

/// The open sheet's state, and the way back to the web side.
final class AccountSheetModel: ObservableObject {
    @Published var state: AccountState {
        didSet {
            if state.profile.avatar != oldValue.profile.avatar { loadAvatar() }
        }
    }
    @Published private(set) var avatar: UIImage? = nil
    /// Where the sheet opens to: "notifications" scrolls down to that card.
    let focus: String?

    var onAction: (String, String?) -> Void = { _, _ in }
    var onClose: () -> Void = {}
    var onManageSubscriptions: () -> Void = {}

    init(state: AccountState, focus: String?) {
        self.state = state
        self.focus = focus
        loadAvatar()
    }

    func send(_ type: String, _ value: String? = nil) {
        onAction(type, value)
    }

    private func loadAvatar() {
        guard let link = state.profile.avatar, !link.isEmpty else {
            avatar = nil
            return
        }
        if link.hasPrefix("data:") {
            guard let comma = link.firstIndex(of: ",") else { return }
            let encoded = String(link[link.index(after: comma)...])
            avatar = Data(base64Encoded: encoded).flatMap { UIImage(data: $0) }
            return
        }
        guard let url = URL(string: link) else { return }
        URLSession.shared.dataTask(with: url) { [weak self] data, _, _ in
            guard let data, let image = UIImage(data: data) else { return }
            DispatchQueue.main.async {
                guard let self, self.state.profile.avatar == link else { return }
                self.avatar = image
            }
        }.resume()
    }
}

extension Color {
    /// "#34d399" or "#fff", with an optional opacity.
    init(hex: String, opacity: Double = 1) {
        var digits = hex.trimmingCharacters(in: .whitespaces)
        if digits.hasPrefix("#") { digits.removeFirst() }
        if digits.count == 3 { digits = digits.map { "\($0)\($0)" }.joined() }
        let value = UInt64(digits, radix: 16) ?? 0xffffff
        let red = Double((value >> 16) & 0xff) / 255
        let green = Double((value >> 8) & 0xff) / 255
        let blue = Double(value & 0xff) / 255
        self.init(.sRGB, red: red, green: green, blue: blue, opacity: opacity)
    }
}

/// The theme photos, read small from the app's bundled web files.
enum ThemeImages {
    private static var cache: [String: UIImage] = [:]

    static func load(_ path: String) -> UIImage? {
        if let hit = cache[path] { return hit }
        let relative = path.hasPrefix("/") ? String(path.dropFirst()) : path
        guard let root = Bundle.main.resourceURL else { return nil }
        let url = root.appendingPathComponent("public").appendingPathComponent(relative)
        guard let source = CGImageSourceCreateWithURL(url as CFURL, nil) else { return nil }
        let options: [CFString: Any] = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceThumbnailMaxPixelSize: 360,
            kCGImageSourceCreateThumbnailWithTransform: true,
        ]
        guard let image = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) else { return nil }
        let result = UIImage(cgImage: image)
        cache[path] = result
        return result
    }
}

#if DEBUG
extension AccountState {
    /// A filled-in sheet for the simulator screenshots the CI check takes
    /// (.github/workflows/ios-native-check.yml): the app opens it when
    /// launched with -SprindAccountDemo.
    static func demo(level: Int) -> AccountState {
        let ranks: [(String, Int, String, String, String)] = [
            ("tourist", 1, "Tourist", "#e2e8f0", "#94a3b8"),
            ("phrasebook", 5, "Phrasebook Holder", "#f59e0b", "#b45309"),
            ("backpacker", 10, "Backpacker", "#e5e7eb", "#9ca3af"),
            ("conversationalist", 15, "Conversationalist", "#facc15", "#f59e0b"),
            ("wordsmith", 20, "Wordsmith", "#34d399", "#059669"),
            ("interpreter", 25, "Interpreter", "#60a5fa", "#2563eb"),
            ("storyteller", 30, "Storyteller", "#c084fc", "#7c3aed"),
            ("polyglot", 40, "Polyglot", "#fb7185", "#e11d48"),
            ("linguist", 50, "Linguist", "#f0abfc", "#22d3ee"),
            ("lexicon", 60, "Lexicon Lord", "#5eead4", "#a78bfa"),
            ("babel", 75, "Babel Breaker", "#a5b4fc", "#f472b6"),
            ("ages", 90, "Tongue of Ages", "#fde68a", "#fbbf24"),
            ("omniglot", 100, "Omniglot", "#ffffff", "#f472b6"),
        ]
        let earned = ranks.last { $0.1 <= level } ?? ranks[0]
        let next = ranks.first { $0.1 > level }
        return AccountState(
            title: "Account",
            closeLabel: "Close account",
            dark: true,
            profile: Profile(name: "Alex Martin", email: "alex@example.com", avatar: nil, initials: "AM"),
            level: Level(
                level: level,
                progress: 0.62,
                rank: earned.0,
                levelLabel: "Level \(level)",
                xpLabel: "2,140 / 3,452 XP",
                hint: next.map { "1,312 XP to level \(level + 1) · \($0.2) border at \($0.1)" },
                bordersLabel: "Borders",
                previewLabel: "preview",
                ranks: ranks.map {
                    Rank(id: $0.0, minLevel: $0.1, title: $0.2, color: $0.3, accent: $0.4,
                         owned: $0.1 <= level, unlockLabel: "Lv \($0.1)")
                }
            ),
            subscription: Subscription(title: "Subscription", premium: true, badge: "Premium",
                                       lines: ["Yearly plan", "Renews on March 3, 2027"]),
            theme: Theme(
                title: "Theme",
                desc: "Crowned themes come with Premium.",
                current: "original",
                items: [
                    .init(id: "original", name: "Original", premium: false, light: false, chrome: false, image: "/bg.jpeg"),
                    .init(id: "mono", name: "Mono", premium: false, light: false, chrome: false, image: "/themes/mono.jpg"),
                    .init(id: "plum-duotone", name: "Plum", premium: false, light: false, chrome: false, image: "/themes/plum-duotone.jpg"),
                    .init(id: "rose-glass", name: "Rose Glass", premium: false, light: false, chrome: false, image: nil),
                    .init(id: "paper", name: "Paper", premium: true, light: true, chrome: false, image: nil),
                    .init(id: "obsidian", name: "Obsidian", premium: true, light: false, chrome: true, image: nil),
                ],
                tryLive: "Try live"
            ),
            notifications: Notifications(title: "Notifications", desc: "Streak protection & review reminders",
                                         on: true, badge: "On", button: "Open Notification Settings"),
            leaderboard: Leaderboard(title: "Show on Leaderboard", desc: "Display your first name and photo", on: true),
            widget: Widget(
                title: "Home-screen widget",
                desc: "A flashcard on your home screen. Tap it to hear the word.",
                added: false,
                addedLabel: "Added",
                sourceLabel: "Words from",
                source: "random",
                options: [.init(value: "random", label: "Random words"), .init(value: "3", label: "Food & Drink")],
                status: nil,
                statusFailed: false,
                addButton: nil,
                howToTitle: "How to add it",
                steps: [
                    "Touch and hold an empty spot on your Home Screen.",
                    "Tap Edit (or +), then Add Widget.",
                    "Search for Sprind and add the flashcard widget.",
                ]
            ),
            offline: Offline(title: "Offline Mode", done: false, rows: [
                .init(id: "en>es", flags: ["🇺🇸", "🇪🇸"], title: "English → Spanish", subtitle: "Downloading 42%…",
                      tone: "muted", percent: 42, active: true,
                      actions: [.init(id: "pause", label: nil, disabled: false), .init(id: "cancel", label: nil, disabled: false)]),
                .init(id: "en>fr", flags: ["🇺🇸", "🇫🇷"], title: "English → French", subtitle: "Downloaded · 186 MB",
                      tone: "good", percent: nil, active: false,
                      actions: [.init(id: "remove", label: nil, disabled: false)]),
            ]),
            buttons: Buttons(manageSubscription: "Manage Subscription", deleteAccount: "Delete Account", signOut: "Sign Out"),
            delete: Delete(
                title: "Delete Account?",
                warning: "You have an active subscription. Deleting your account will <b>not</b> cancel it.",
                permanent: "This will permanently delete your account and all your data. This action cannot be undone.",
                hint: "Type <b>delete</b> to confirm",
                word: "delete",
                cancel: "Cancel",
                confirm: "Yes, Delete",
                deleting: "Deleting...",
                busy: false,
                error: nil
            )
        )
    }
}
#endif
