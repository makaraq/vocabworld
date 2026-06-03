import UIKit
import Capacitor
import WebKit

class ViewController: CAPBridgeViewController {

    private let disableSelectionJS = """
        (function() {
            var style = document.createElement('style');
            style.id = '__no-select__';
            style.textContent = '* { -webkit-user-select: none !important; -webkit-touch-callout: none !important; user-select: none !important; } input, textarea, [contenteditable] { -webkit-user-select: text !important; user-select: text !important; }';
            document.documentElement.appendChild(style);
            document.addEventListener('contextmenu', function(e) { e.preventDefault(); e.stopPropagation(); }, true);
            document.addEventListener('selectstart', function(e) { e.preventDefault(); e.stopPropagation(); }, true);
        })();
    """

    override func capacitorDidLoad() {
        // Register native background audio plugin
        bridge?.registerPluginInstance(BackgroundAudioPlugin())

        // Add as a persistent user script (runs on every page load/navigation)
        let userScript = WKUserScript(
            source: disableSelectionJS,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: false
        )
        webView?.configuration.userContentController.addUserScript(userScript)

        // Also apply immediately to the current page
        webView?.evaluateJavaScript(disableSelectionJS, completionHandler: nil)
    }
}
