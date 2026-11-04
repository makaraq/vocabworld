import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

const impact = async (style: ImpactStyle) => {
  try { await Haptics.impact({ style }) } catch {}
}

const notify = async (type: NotificationType) => {
  try { await Haptics.notification({ type }) } catch {}
}

let selectionOpen = false

const tick = async () => {
  // The plugin's Android selection is a slow 100 ms hum, so use a light tap.
  if (Capacitor.getPlatform() === 'android') return impact(ImpactStyle.Light)
  try {
    // Opened once and left open: the plugin re-prepares the generator after
    // each tick, so the next one lands with less delay.
    if (!selectionOpen) {
      await Haptics.selectionStart()
      selectionOpen = true
    }
    await Haptics.selectionChanged()
  } catch {}
}

/**
 * What the user feels, named by what just happened. Call sites pick the moment;
 * how each moment feels is decided here.
 */
export const haptic = {
  /** An ordinary button: navigation, opening, closing, next/previous. */
  tap: () => impact(ImpactStyle.Light),
  /** Choosing one option from a set: pickers, tabs, plans. */
  select: tick,
  /** Flipping a switch. */
  toggle: () => impact(ImpactStyle.Medium),
  /** A main action starting: play, download, subscribe. */
  action: () => impact(ImpactStyle.Medium),
  /** A long-press has registered. */
  hold: () => impact(ImpactStyle.Medium),
  /** The app said no: a locked topic, not enough coins. Not the user's mistake. */
  denied: () => impact(ImpactStyle.Medium),
  /** A right answer. */
  correct: () => notify(NotificationType.Success),
  /** A wrong answer. */
  wrong: () => notify(NotificationType.Error),
  /** Something finished well: topic complete, purchase, a level reached. */
  success: () => notify(NotificationType.Success),
  /** Removing something, or stepping toward removing it. */
  destructive: () => notify(NotificationType.Warning),
  /** The big moments: the level-up burst, a new rank. */
  celebrate: () => impact(ImpactStyle.Heavy),
}
