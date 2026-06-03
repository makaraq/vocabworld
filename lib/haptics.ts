import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

export async function hapticsLight() {
  try { await Haptics.impact({ style: ImpactStyle.Light }) } catch {}
}

export async function hapticsMedium() {
  try { await Haptics.impact({ style: ImpactStyle.Medium }) } catch {}
}

export async function hapticsHeavy() {
  try { await Haptics.impact({ style: ImpactStyle.Heavy }) } catch {}
}

export async function hapticsSuccess() {
  try { await Haptics.notification({ type: NotificationType.Success }) } catch {}
}

export async function hapticsWarning() {
  try { await Haptics.notification({ type: NotificationType.Warning }) } catch {}
}
