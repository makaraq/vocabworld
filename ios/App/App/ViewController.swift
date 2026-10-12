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
        // Add as a persistent user script (runs on every page load/navigation)
        let userScript = WKUserScript(
            source: disableSelectionJS,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: false
        )
        webView?.configuration.userContentController.addUserScript(userScript)

        // Also apply immediately to the current page
        webView?.evaluateJavaScript(disableSelectionJS, completionHandler: nil)

        // WebKit doesn't report Reduce Transparency to CSS, so mirror it onto
        // <html> as a class; app/liquid-glass.css swaps its glass for solid
        // fills when it's there. The user script covers the first load, the
        // observer covers the setting changing while the app is open.
        webView?.configuration.userContentController.addUserScript(WKUserScript(
            source: reduceTransparencyJS(),
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        ))
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(reduceTransparencyChanged),
            name: UIAccessibility.reduceTransparencyStatusDidChangeNotification,
            object: nil
        )
    }

    private func reduceTransparencyJS() -> String {
        let on = UIAccessibility.isReduceTransparencyEnabled ? "true" : "false"
        return "document.documentElement.classList.toggle('reduce-transparency', \(on));"
    }

    @objc private func reduceTransparencyChanged() {
        webView?.evaluateJavaScript(reduceTransparencyJS(), completionHandler: nil)
    }
}
