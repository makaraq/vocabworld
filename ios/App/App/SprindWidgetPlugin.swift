import Foundation
import Capacitor
import UIKit
import WidgetKit

/// Bridge for lib/widget/home-widget.ts: hands the home-screen flashcard widget
/// its word list (App Group defaults) and downloads the words' audio and
/// pictures into the App Group container, so the widget works offline.
/// Registered in ViewController.capacitorDidLoad.
@objc(SprindWidgetPlugin)
public class SprindWidgetPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SprindWidgetPlugin"
    public let jsName = "SprindWidget"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setWords", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPin", returnType: CAPPluginReturnPromise),
    ]

    override public func load() {
        // Finish any download the last session didn't
        WidgetDownloader.downloadMissing()
    }

    @objc func setWords(_ call: CAPPluginCall) {
        guard let payload = call.getString("payload") else {
            call.reject("payload is required")
            return
        }
        guard WidgetShared.container != nil else {
            call.reject("App Group not available")
            return
        }
        do {
            try WidgetStore.save(payload: payload)
        } catch {
            call.reject("Invalid widget payload")
            return
        }
        WidgetShared.reload()
        WidgetDownloader.downloadMissing()
        call.resolve()
    }

    @objc func getStatus(_ call: CAPPluginCall) {
        // Interactive widgets need iOS 17; without the App Group the widget can't read anything
        guard #available(iOS 17.0, *), WidgetShared.container != nil else {
            call.resolve(["supported": false, "installed": 0, "canPin": false])
            return
        }
        WidgetCenter.shared.getCurrentConfigurations { result in
            let installed = ((try? result.get()) ?? []).filter { $0.kind == WidgetShared.kind }.count
            call.resolve(["supported": true, "installed": installed, "canPin": false])
        }
    }

    /// iOS has no API to add a widget for the user; the app shows the steps instead
    @objc func requestPin(_ call: CAPPluginCall) {
        call.resolve(["requested": false])
    }
}

enum WidgetDownloader {
    private static let queue = DispatchQueue(label: "com.sprind.widget.download", qos: .utility)
    // Long side of a stored picture: sharp on a widget, light on its memory budget
    private static let imageMaxPx: CGFloat = 360

    static func downloadMissing() {
        queue.async {
            guard let deck = WidgetStore.load() else { return }
            var keep = Set<String>()
            for (n, word) in deck.words.enumerated() {
                keep.insert(String(word.id))
                if let link = word.image, let url = URL(string: link),
                   let dest = WidgetStore.imageURL(for: word.id),
                   !FileManager.default.fileExists(atPath: dest.path) {
                    saveImage(from: url, to: dest)
                }
                if let link = word.audio, let url = URL(string: link),
                   WidgetStore.audioURL(for: word.id) == nil {
                    saveAudio(from: url, id: word.id)
                }
                // Show the first cards' art as soon as it's there
                if n == 2 { WidgetShared.reload() }
            }
            prune("img", keep: keep)
            prune("audio", keep: keep)
            WidgetShared.reload()
        }
    }

    private static func fetch(_ url: URL) -> (Data, String)? {
        var result: (Data, String)?
        let done = DispatchSemaphore(value: 0)
        var request = URLRequest(url: url)
        request.timeoutInterval = 20
        URLSession.shared.dataTask(with: request) { data, response, _ in
            if let data, !data.isEmpty, let http = response as? HTTPURLResponse, http.statusCode == 200 {
                result = (data, http.value(forHTTPHeaderField: "Content-Type") ?? "")
            }
            done.signal()
        }.resume()
        done.wait()
        return result
    }

    private static func saveImage(from url: URL, to dest: URL) {
        guard let data = fetch(url)?.0, let image = UIImage(data: data) else { return }
        let longSide = max(image.size.width, image.size.height)
        let scale = min(1, imageMaxPx / max(longSide, 1))
        let size = CGSize(width: (image.size.width * scale).rounded(), height: (image.size.height * scale).rounded())
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        format.opaque = false
        let resized = UIGraphicsImageRenderer(size: size, format: format).image { _ in
            image.draw(in: CGRect(origin: .zero, size: size))
        }
        try? resized.pngData()?.write(to: dest, options: .atomic)
    }

    private static func saveAudio(from url: URL, id: Int) {
        guard let fetched = fetch(url), let dir = WidgetStore.directory("audio") else { return }
        let (data, type) = fetched
        if type.contains("json") || type.contains("html") { return }
        let ext = type.contains("mpeg") ? "mp3" : "wav"
        try? data.write(to: dir.appendingPathComponent("\(id).\(ext)"), options: .atomic)
    }

    private static func prune(_ name: String, keep: Set<String>) {
        guard let dir = WidgetStore.directory(name),
              let files = try? FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil) else { return }
        for file in files where !keep.contains(file.deletingPathExtension().lastPathComponent) {
            try? FileManager.default.removeItem(at: file)
        }
    }
}
