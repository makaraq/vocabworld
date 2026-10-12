// Liquid Glass: an iOS 26-style look for the web layer (app/liquid-glass.css).
// Every rule in that stylesheet is scoped under <html class="liquid-glass">,
// so whether that class is set is the whole on/off switch.
//
// LIQUID_GLASS
//   'ios' - on in the iOS app; web and Android keep the old look.
//   'off' - off everywhere. The stylesheet stays loaded but matches nothing.
export const LIQUID_GLASS: 'ios' | 'off' = 'ios'

// Per-device override, flipped by a two-finger hold (LiquidGlassSwitch), so
// the old and new looks can be compared on a phone without a new build.
// Web visitors only ever get one by opening the app with ?glass=1 (?glass=0
// clears it), which lets the look be previewed in a desktop browser.
export const LIQUID_GLASS_STORAGE_KEY = 'sprind:liquid-glass'

// Runs inline in <head>, before first paint, so the page never flashes the
// old look. Kept as plain ES5 because it is not compiled.
export const liquidGlassBootScript = `(function () {
  if (${JSON.stringify(LIQUID_GLASS)} === 'off') return;
  var key = ${JSON.stringify(LIQUID_GLASS_STORAGE_KEY)};
  var cap = window.Capacitor;
  var ios = !!(cap && cap.isNativePlatform && cap.isNativePlatform() &&
    cap.getPlatform && cap.getPlatform() === 'ios');
  var pref = null;
  try {
    var q = /[?&]glass=([01])/.exec(window.location.search);
    if (q) {
      if (q[1] === '1') localStorage.setItem(key, 'on');
      else localStorage.removeItem(key);
    }
    pref = localStorage.getItem(key);
  } catch (e) {}
  var on = ios ? pref !== 'off' : pref === 'on';
  if (on) document.documentElement.classList.add('liquid-glass');
})();`

function isIOSApp(): boolean {
  const cap = (window as any).Capacitor
  return !!cap?.isNativePlatform?.() && cap?.getPlatform?.() === 'ios'
}

// Whether this device can show the look at all: the iOS app, or a browser
// that opted in with ?glass=1.
export function liquidGlassAvailable(): boolean {
  if (LIQUID_GLASS === 'off') return false
  if (isIOSApp()) return true
  try {
    return localStorage.getItem(LIQUID_GLASS_STORAGE_KEY) !== null
  } catch {
    return false
  }
}

export function setLiquidGlass(on: boolean) {
  document.documentElement.classList.toggle('liquid-glass', on)
  try {
    localStorage.setItem(LIQUID_GLASS_STORAGE_KEY, on ? 'on' : 'off')
  } catch {}
}
