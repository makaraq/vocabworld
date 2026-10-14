// Render settings for the Sprind launch film. See https://www.remotion.dev/docs/config
import { Config } from '@remotion/cli/config'
import { enableTailwind } from '@remotion/tailwind-v4'

Config.setVideoImageFormat('jpeg')
Config.setJpegQuality(92)
Config.setCodec('h264')
Config.setPixelFormat('yuv420p')
Config.setCrf(18)
Config.setOverwriteOutput(true)
// The app screens are rebuilt with the app's own Tailwind classes.
Config.overrideWebpackConfig((config) => enableTailwind(config))

// Use a locally installed Chrome Headless Shell when one is provided
// (e.g. REMOTION_BROWSER_EXECUTABLE=/opt/pw-browsers/.../headless_shell),
// otherwise Remotion downloads its own.
if (process.env.REMOTION_BROWSER_EXECUTABLE) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER_EXECUTABLE)
}
