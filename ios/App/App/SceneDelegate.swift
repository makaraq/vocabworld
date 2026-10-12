import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    // Set by UIKit from the Main storyboard declared in Info.plist's scene manifest.
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        // Cold launch via a custom-scheme URL or Universal Link: scene(_:openURLContexts:)
        // and scene(_:continue:) are not called for these, so forward them here.
        // Load the bridge view first: Capacitor registers its plugins in loadView, and
        // the App plugin must already be observing or it misses the appUrlOpen event.
        if !connectionOptions.urlContexts.isEmpty || !connectionOptions.userActivities.isEmpty {
            window?.rootViewController?.loadViewIfNeeded()
        }
        if let urlContext = connectionOptions.urlContexts.first {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: urlContext.url, options: [:])
        }
        if let userActivity = connectionOptions.userActivities.first(where: { $0.activityType == NSUserActivityTypeBrowsingWeb }) {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
        }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        guard let url = URLContexts.first?.url else { return }
        _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: url, options: [:])
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
    }
}
