import Foundation
import AppIntents
import AVFoundation
import WidgetKit

// Shared by the app (SprindWidgetPlugin writes the words; PlayWordIntent plays
// audio in the app's process) and the widget extension (reads the words,
// pages through them). Compiled into both targets.

enum WidgetShared {
    static let appGroup = "group.com.sprind.app"
    static let kind = "SprindFlashcard"

    static var defaults: UserDefaults? { UserDefaults(suiteName: appGroup) }

    /// nil when the App Group entitlement is missing from the signed build
    static var container: URL? {
        FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroup)
    }

    static func reload() {
        WidgetCenter.shared.reloadTimelines(ofKind: kind)
    }
}

struct WidgetWord: Codable, Hashable {
    let id: Int
    let word: String
    let translation: String
    let audio: String?
    let image: String?
}

/// The word list from lib/widget/home-widget.ts
struct WidgetDeck: Codable {
    let key: String
    let label: String
    let empty: String
    let words: [WidgetWord]
}

enum WidgetStore {
    private static let payloadKey = "widget.payload"
    private static let indexKey = "widget.index"
    private static let playingKey = "widget.playing"
    private static let playingUntilKey = "widget.playingUntil"

    static func load() -> WidgetDeck? {
        guard let data = WidgetShared.defaults?.data(forKey: payloadKey) else { return nil }
        return try? JSONDecoder().decode(WidgetDeck.self, from: data)
    }

    /// Stores a new word list. A different list starts again from its first card.
    static func save(payload: String) throws {
        let data = Data(payload.utf8)
        let next = try JSONDecoder().decode(WidgetDeck.self, from: data)
        guard let defaults = WidgetShared.defaults else { return }
        if load()?.key != next.key { defaults.set(0, forKey: indexKey) }
        defaults.set(data, forKey: payloadKey)
    }

    static func index(in deck: WidgetDeck) -> Int {
        let count = deck.words.count
        guard count > 0 else { return 0 }
        let i = (WidgetShared.defaults?.integer(forKey: indexKey) ?? 0) % count
        return i < 0 ? i + count : i
    }

    static func move(by step: Int) {
        guard let deck = load(), !deck.words.isEmpty else { return }
        let count = deck.words.count
        let next = ((index(in: deck) + step) % count + count) % count
        WidgetShared.defaults?.set(next, forKey: indexKey)
        setPlaying(nil)
    }

    /// The word playing now, if its clip can't have ended yet. The time limit
    /// keeps a stop icon from sticking if the app is killed mid-clip.
    static var playingId: Int? {
        guard let defaults = WidgetShared.defaults,
              let until = defaults.object(forKey: playingUntilKey) as? Date, until > Date() else { return nil }
        let id = defaults.integer(forKey: playingKey)
        return id == 0 ? nil : id
    }

    static var playingUntil: Date? {
        WidgetShared.defaults?.object(forKey: playingUntilKey) as? Date
    }

    static func setPlaying(_ id: Int?, duration: TimeInterval = 0) {
        guard let defaults = WidgetShared.defaults else { return }
        if let id {
            defaults.set(id, forKey: playingKey)
            defaults.set(Date().addingTimeInterval(min(max(duration, 1), 10) + 0.5), forKey: playingUntilKey)
        } else {
            defaults.removeObject(forKey: playingKey)
            defaults.removeObject(forKey: playingUntilKey)
        }
    }

    static func directory(_ name: String) -> URL? {
        guard let base = WidgetShared.container?.appendingPathComponent("widget/\(name)", isDirectory: true) else { return nil }
        try? FileManager.default.createDirectory(at: base, withIntermediateDirectories: true)
        return base
    }

    static func imageURL(for id: Int) -> URL? {
        directory("img")?.appendingPathComponent("\(id).png")
    }

    /// The word's downloaded pronunciation (mp3 or wav), if there is one
    static func audioURL(for id: Int) -> URL? {
        guard let dir = directory("audio") else { return nil }
        for ext in ["mp3", "wav"] {
            let url = dir.appendingPathComponent("\(id).\(ext)")
            if FileManager.default.fileExists(atPath: url.path) { return url }
        }
        return nil
    }
}

// MARK: - Widget buttons (iOS 17 interactive widgets)

@available(iOS 17.0, *)
struct PreviousWordIntent: AppIntent {
    static var title: LocalizedStringResource = "Previous word"
    static var isDiscoverable: Bool = false

    func perform() async throws -> some IntentResult {
        WidgetStore.move(by: -1)
        return .result()
    }
}

@available(iOS 17.0, *)
struct NextWordIntent: AppIntent {
    static var title: LocalizedStringResource = "Next word"
    static var isDiscoverable: Bool = false

    func perform() async throws -> some IntentResult {
        WidgetStore.move(by: 1)
        return .result()
    }
}

/// Tapping the card: plays the word, or stops it if it's playing. As an
/// AudioPlaybackIntent the system runs it in the app's process (in the
/// background, without opening the app), which is where audio can play.
@available(iOS 17.0, *)
struct PlayWordIntent: AudioPlaybackIntent {
    static var title: LocalizedStringResource = "Play word"
    static var isDiscoverable: Bool = false

    @Parameter(title: "Word")
    var wordId: Int

    init() {}

    init(wordId: Int) {
        self.wordId = wordId
    }

    func perform() async throws -> some IntentResult {
        await WidgetAudioPlayer.shared.toggle(wordId: wordId)
        return .result()
    }
}

@MainActor
final class WidgetAudioPlayer: NSObject, AVAudioPlayerDelegate {
    static let shared = WidgetAudioPlayer()

    private var player: AVAudioPlayer?
    private var currentId: Int?

    func toggle(wordId: Int) async {
        if currentId == wordId, player?.isPlaying == true {
            stop()
            return
        }
        stop()
        guard let data = await audioData(for: wordId) else { return }
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .spokenAudio, options: [.duckOthers])
            try session.setActive(true)
            let player = try AVAudioPlayer(data: data)
            player.delegate = self
            guard player.play() else { stop(); return }
            self.player = player
            currentId = wordId
            WidgetStore.setPlaying(wordId, duration: player.duration)
            WidgetShared.reload()
        } catch {
            stop()
        }
    }

    func stop() {
        let wasPlaying = player != nil
        player?.stop()
        player = nil
        currentId = nil
        if wasPlaying {
            try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        }
        WidgetStore.setPlaying(nil)
        WidgetShared.reload()
    }

    nonisolated func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        Task { @MainActor in self.stop() }
    }

    nonisolated func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) {
        Task { @MainActor in self.stop() }
    }

    /// The downloaded clip, or (not downloaded yet) straight from the server
    private func audioData(for wordId: Int) async -> Data? {
        if let url = WidgetStore.audioURL(for: wordId), let data = try? Data(contentsOf: url) {
            return data
        }
        guard let link = WidgetStore.load()?.words.first(where: { $0.id == wordId })?.audio,
              let url = URL(string: link),
              let result = try? await URLSession.shared.data(from: url),
              (result.1 as? HTTPURLResponse)?.statusCode == 200 else { return nil }
        return result.0
    }
}
