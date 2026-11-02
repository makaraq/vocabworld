// Bridge to the iPhone's native Manage Account sheet
// (ios/App/App/AccountSheetPlugin.swift). The web side keeps every rule and
// sends the sheet its whole state as JSON; the sheet answers with what was
// tapped. Android and the web keep the web sheet.

import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'

export interface AccountSheetAction {
  /** closed, theme, tryThemes, leaderboard, widgetSource, widgetAdd, offline, deleteAccount or signOut */
  type: string
  value?: string
}

interface AccountSheetPlugin {
  present(options: {
    state: string
    /** Pictures the state names (the offline rows' flags), as PNG data URLs. Each is sent once. */
    images?: Record<string, string>
    /** "notifications" opens the sheet scrolled to that card. */
    focus?: string
    /** Where the button it opens out of is, in CSS pixels. */
    sourceX?: number
    sourceY?: number
    sourceWidth?: number
    sourceHeight?: number
  }): Promise<void>
  update(options: { state: string; images?: Record<string, string> }): Promise<void>
  dismiss(): Promise<void>
  addListener(event: 'action', listener: (action: AccountSheetAction) => void): Promise<PluginListenerHandle>
}

export const AccountSheet = registerPlugin<AccountSheetPlugin>('AccountSheet')

/** The iPhone app draws Manage Account natively. */
export function hasNativeAccountSheet(): boolean {
  return Capacitor.getPlatform() === 'ios' && Capacitor.isPluginAvailable('AccountSheet')
}
