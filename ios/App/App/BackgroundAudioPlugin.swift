import Capacitor
import AVFoundation
import MediaPlayer

/// Native background audio queue player for Sprind.
/// Plays word audio using AVPlayer (which iOS keeps alive in background)
/// and bridges a silent AVAudioPlayer keep-alive so the process never sleeps.
@objc(BackgroundAudioPlugin)
public class BackgroundAudioPlugin: CAPPlugin, CAPBridgedPlugin {

    // MARK: – Capacitor boilerplate

    public let identifier = "BackgroundAudioPlugin"
    public let jsName = "BackgroundAudio"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "startQueue", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop",       returnType: CAPPluginReturnPromise),
    ]

    // MARK: – Internal types

    private struct WordItem {
        let index: Int
        let targetUrl: String
        let sourceUrl: String?
        let targetWord: String
        let sourceWord: String
        let topicName: String
    }

    private enum Phase {
        case targetRepeat(Int)   // 0-based repeat index
        case pauseBetween
        case sourceRepeat(Int)
        case pauseAfter
    }

    // MARK: – State

    private var words: [WordItem] = []
    private var cursor: Int = 0          // index into `words`
    private var phase: Phase = .targetRepeat(0)
    private var isActive = false

    // Settings (set once per startQueue call)
    private var repeatTarget  = 1
    private var repeatSource  = 1
    private var pauseBetweenMs = 500
    private var pauseAfterMs  = 700
    private var rate: Float   = 1.0
    private var targetOnly    = false
    private var authToken: String?
    private var rewindEnabled = false
    private var rewindAfter   = 5
    private var anchor        = 0
    private var sinceAnchor   = 0

    // Audio players
    private var player: AVPlayer?
    private var silentPlayer: AVAudioPlayer?
    private var endObserver: Any?
    private var failObserver: Any?
    private var stallTimer: Timer?

    // MARK: – Plugin entry points

    @objc func startQueue(_ call: CAPPluginCall) {
        guard let raw = call.getArray("words") as? [[String: Any]], !raw.isEmpty else {
            call.reject("words array required"); return
        }

        words = raw.compactMap { d in
            guard let idx = d["index"] as? Int,
                  let tUrl = d["targetUrl"] as? String else { return nil }
            return WordItem(
                index:      idx,
                targetUrl:  tUrl,
                sourceUrl:  d["sourceUrl"] as? String,
                targetWord: (d["targetWord"] as? String) ?? "",
                sourceWord: (d["sourceWord"] as? String) ?? "",
                topicName:  (d["topicName"]  as? String) ?? ""
            )
        }
        guard !words.isEmpty else { call.reject("No valid words"); return }

        repeatTarget   = call.getInt("repeatTarget")   ?? 1
        repeatSource   = call.getInt("repeatSource")   ?? 1
        pauseBetweenMs = call.getInt("pauseBetweenMs")  ?? 500
        pauseAfterMs   = call.getInt("pauseAfterMs")    ?? 700
        rate           = call.getFloat("playbackRate")  ?? 1.0
        targetOnly     = call.getBool("playTargetOnly") ?? false
        authToken      = call.getString("authToken")
        rewindEnabled  = call.getBool("rewindEnabled")  ?? false
        rewindAfter    = call.getInt("rewindAfterWords") ?? 5
        cursor         = 0
        anchor         = 0
        sinceAnchor    = 0
        isActive       = true

        ensureAudioSession()
        startSilentKeepAlive()
        setupRemoteCommands()
        playCurrentWord()

        call.resolve()
    }

    @objc func stop(_ call: CAPPluginCall) {
        tearDown()
        call.resolve()
    }

    // MARK: – Playback orchestration

    private func playCurrentWord() {
        guard isActive, cursor < words.count else { finish(); return }

        let w = words[cursor]
        phase = .targetRepeat(0)

        notify("wordChanged", data: ["index": w.index, "phase": "target"])
        updateNowPlaying(w, phase: "target")
        playURL(w.targetUrl)
    }

    /// Called every time an audio clip ends (or fails).
    private func advance() {
        guard isActive, cursor < words.count else { finish(); return }
        let w = words[cursor]

        switch phase {

        // ── Target repeats ──────────────────────────────────
        case .targetRepeat(let i):
            if i + 1 < repeatTarget {
                phase = .targetRepeat(i + 1)
                after(ms: 300) { self.playURL(w.targetUrl) }
            } else if !targetOnly, let sUrl = w.sourceUrl {
                phase = .pauseBetween
                notify("wordChanged", data: ["index": w.index, "phase": "pause"])
                after(ms: pauseBetweenMs) {
                    self.phase = .sourceRepeat(0)
                    self.notify("wordChanged", data: ["index": w.index, "phase": "source"])
                    self.updateNowPlaying(w, phase: "source")
                    self.playURL(sUrl)
                }
            } else {
                nextWord()
            }

        // ── Source repeats ──────────────────────────────────
        case .sourceRepeat(let i):
            if i + 1 < repeatSource, let sUrl = w.sourceUrl {
                phase = .sourceRepeat(i + 1)
                after(ms: 300) { self.playURL(sUrl) }
            } else {
                nextWord()
            }

        default: break
        }
    }

    private func nextWord() {
        guard isActive else { return }

        let w = words[cursor]
        sinceAnchor += 1
        notify("wordPlayed", data: ["index": w.index])

        if rewindEnabled && sinceAnchor >= rewindAfter {
            cursor = anchor; sinceAnchor = 0
        } else {
            cursor += 1
        }

        guard cursor < words.count else { finish(); return }

        phase = .pauseAfter
        after(ms: pauseAfterMs) { self.playCurrentWord() }
    }

    private func finish() {
        let wasActive = isActive
        cleanUpAudio()
        if wasActive { notify("complete", data: [:]) }
    }

    private func tearDown() {
        let wasActive = isActive
        cleanUpAudio()
        if wasActive { notify("stopped", data: [:]) }
    }

    private func cleanUpAudio() {
        isActive = false
        stallTimer?.invalidate(); stallTimer = nil
        removeEndObservers()
        player?.pause(); player = nil
        silentPlayer?.stop(); silentPlayer = nil
        clearRemoteCommands()
    }

    // MARK: – AVPlayer helpers

    private func playURL(_ urlString: String) {
        guard isActive, let url = URL(string: urlString) else { advance(); return }

        removeEndObservers()
        stallTimer?.invalidate()

        var opts: [String: Any] = [:]
        if let tk = authToken {
            opts["AVURLAssetHTTPHeaderFieldsKey"] = ["Authorization": "Bearer \(tk)"]
        }
        let asset = AVURLAsset(url: url, options: opts.isEmpty ? nil : opts)
        let item = AVPlayerItem(asset: asset)

        endObserver = NotificationCenter.default.addObserver(
            forName: NSNotification.Name.AVPlayerItemDidPlayToEndTime, object: item, queue: .main
        ) { [weak self] _ in self?.onClipEnd() }

        failObserver = NotificationCenter.default.addObserver(
            forName: NSNotification.Name.AVPlayerItemFailedToPlayToEndTime, object: item, queue: .main
        ) { [weak self] _ in self?.onClipEnd() }

        if player == nil { player = AVPlayer(playerItem: item) }
        else { player?.replaceCurrentItem(with: item) }

        player?.play()
        if rate != 1.0 { player?.rate = rate }

        // Safety timeout – skip if nothing plays within 15 s
        stallTimer = Timer.scheduledTimer(withTimeInterval: 15, repeats: false) { [weak self] _ in
            self?.onClipEnd()
        }
    }

    private func onClipEnd() {
        stallTimer?.invalidate(); stallTimer = nil
        removeEndObservers()
        advance()
    }

    private func removeEndObservers() {
        if let o = endObserver  { NotificationCenter.default.removeObserver(o); endObserver = nil }
        if let o = failObserver { NotificationCenter.default.removeObserver(o); failObserver = nil }
    }

    // MARK: – Silent keep-alive

    private func startSilentKeepAlive() {
        guard silentPlayer == nil else { return }
        let data = makeSilentWAV(ms: 1000)
        silentPlayer = try? AVAudioPlayer(data: data)
        silentPlayer?.numberOfLoops = -1
        silentPlayer?.volume = 0.01
        silentPlayer?.play()
    }

    private func makeSilentWAV(ms: Int) -> Data {
        let sr = 22050
        let n  = max(1, sr * ms / 1000)
        let ds = n * 2
        var d  = Data(capacity: 44 + ds)
        func s(_ v: String)  { d.append(v.data(using: .ascii)!) }
        func u32(_ v: Int)   { var x = UInt32(v).littleEndian; d.append(Data(bytes: &x, count: 4)) }
        func u16(_ v: Int)   { var x = UInt16(v).littleEndian; d.append(Data(bytes: &x, count: 2)) }
        s("RIFF"); u32(36+ds); s("WAVE"); s("fmt "); u32(16)
        u16(1); u16(1); u32(sr); u32(sr*2); u16(2); u16(16)
        s("data"); u32(ds); d.append(Data(count: ds))
        return d
    }

    // MARK: – Audio session

    private func ensureAudioSession() {
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("[BackgroundAudio] audio session error: \(error)")
        }
    }

    // MARK: – Now Playing / Remote Commands

    private func updateNowPlaying(_ w: WordItem, phase: String) {
        var info: [String: Any] = [
            MPMediaItemPropertyTitle:  w.targetWord,
            MPMediaItemPropertyArtist: w.sourceWord,
            MPMediaItemPropertyAlbumTitle: "Sprind\(w.topicName.isEmpty ? "" : " · \(w.topicName)")",
            MPNowPlayingInfoPropertyPlaybackRate: Double(rate),
        ]
        if let img = UIImage(named: "AppIcon") {
            info[MPMediaItemPropertyArtwork] =
                MPMediaItemArtwork(boundsSize: img.size) { _ in img }
        }
        MPNowPlayingInfoCenter.default().nowPlayingInfo = info
    }

    private func setupRemoteCommands() {
        let cc = MPRemoteCommandCenter.shared()
        cc.playCommand.isEnabled  = false          // resume not supported yet
        cc.pauseCommand.isEnabled = true
        cc.pauseCommand.addTarget { [weak self] _ in self?.tearDown(); return .success }
        cc.stopCommand.isEnabled  = true
        cc.stopCommand.addTarget  { [weak self] _ in self?.tearDown(); return .success }
        cc.nextTrackCommand.isEnabled = true
        cc.nextTrackCommand.addTarget { [weak self] _ in
            guard let s = self, s.isActive else { return .commandFailed }
            s.removeEndObservers(); s.stallTimer?.invalidate()
            s.player?.pause()
            s.cursor = min(s.cursor + 1, s.words.count - 1); s.sinceAnchor += 1
            s.playCurrentWord(); return .success
        }
        cc.previousTrackCommand.isEnabled = true
        cc.previousTrackCommand.addTarget { [weak self] _ in
            guard let s = self, s.isActive else { return .commandFailed }
            s.removeEndObservers(); s.stallTimer?.invalidate()
            s.player?.pause()
            s.cursor = max(s.cursor - 1, 0)
            s.playCurrentWord(); return .success
        }
    }

    private func clearRemoteCommands() {
        let cc = MPRemoteCommandCenter.shared()
        cc.pauseCommand.removeTarget(nil)
        cc.stopCommand.removeTarget(nil)
        cc.nextTrackCommand.removeTarget(nil)
        cc.previousTrackCommand.removeTarget(nil)
        MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
    }

    // MARK: – Utilities

    private func after(ms: Int, _ block: @escaping () -> Void) {
        DispatchQueue.main.asyncAfter(deadline: .now() + Double(ms) / 1000, execute: block)
    }

    private func notify(_ event: String, data: [String: Any]) {
        notifyListeners(event, data: data)
    }
}
