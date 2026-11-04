// The XP pop-up grown out of the Dynamic Island, on iPhones that have one
// (ios/App/App/IslandToastPlugin.swift). Elsewhere the web pop-up shows
// (components/leveling/level-overlays.tsx).

import { Capacitor, registerPlugin } from '@capacitor/core'

export interface IslandToastOptions {
  level: number
  /** XP earned since the pop-up last showed. */
  xp: number
  /** The quarter of the level reached, written the UI language's way ("50%"). */
  percent: string
  /** A short cheer, in the UI language, shown under the camera. */
  message: string
  /** 0–1: how far round the level ring goes. */
  progress: number
  /** The rank's colours. */
  color: string
  accent: string
}

interface IslandToastPlugin {
  supported(): Promise<{ supported: boolean }>
  show(options: IslandToastOptions): Promise<{ shown: boolean }>
}

const IslandToast = registerPlugin<IslandToastPlugin>('IslandToast')

let support: Promise<boolean> | null = null

/** Whether this phone shows the pop-up in its Dynamic Island. Asked once. */
export function islandSupported(): Promise<boolean> {
  if (Capacitor.getPlatform() !== 'ios' || !Capacitor.isPluginAvailable('IslandToast')) return Promise.resolve(false)
  support ??= IslandToast.supported().then((r) => r.supported).catch(() => false)
  return support
}

/** Shows the pop-up in the island; false when the web one should show instead. */
export async function showInIsland(options: IslandToastOptions): Promise<boolean> {
  if (!(await islandSupported())) return false
  try {
    return (await IslandToast.show(options)).shown
  } catch {
    return false
  }
}
