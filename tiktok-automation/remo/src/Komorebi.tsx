import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Img, delayRender, continueRender, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {S, E0, TOTAL, LIT, CHIPS, PHRASES, WSTEP, WSTART} from './komorebiTimeline';
import {LANGS, audioEnv, GlassBox, Txt, Finger, useFinger, ChevR, Panel, Dots, Body, MenuPage, LearnPage, SettingsPage, QuizPage, StatsPage, PickerPage, ORANGE, INK, CREAM, SORA, UI, clamp, sp, ease, io, lerp, W} from './Glass';
import {GI} from './glassIcons';

export const KOMOREBI_TOTAL = TOTAL;
const VL = 107, VT = 580, VW = 865, VH = 1232, UIS = VW / 393, LW = 393, LH = 560;
const JP: [string, string][] = (() => { const a = LANGS.slice(); const ti = a.findIndex((x) => x[0] === 'Japanese'); const tmp = a[41]; a[41] = a[ti]; a[ti] = tmp; return a; })();
const CAPS: [string, string][] = [
  ['Fifty languages. Fifty skies.', "Today's sky: Japanese."],
  ['Open the First Aid Kit.', 'Pick a topic. Tap Time.'],
  ['Press play. Just listen.', 'Japanese first, then the English.'],
  ['Shrink the pauses.', 'Drag the gap between words down.'],
  ['Now let it flow.', 'Autoplay: everyday Japanese, one go.'],
  ['Did it stick?', 'One tap. Instant answer.'],
  ['Keep it close.', 'Komorebi goes in a playlist.'],
  ['Watch it add up.', 'Words, streaks, badges.'],
];
const HERO = 'Sunlight through leaves';

/* ---------- light through slats: text reveal by venetian blinds ---------- */
const slatMask = (open: number, pitch: number): React.CSSProperties => {
  if (open >= 0.999) return {};
  const o = Math.max(0, open) * pitch;
  const g = `repeating-linear-gradient(to bottom, #000 0px, #000 ${o}px, transparent ${o}px, transparent ${pitch}px)`;
  return {WebkitMaskImage: g, maskImage: g};
};

/* ---------- sky: flat orange, leaf-shadow bands, dapples, halo ---------- */
const BANDS: [number, number][] = [[-1300, 120], [-1060, 70], [-880, 150], [-640, 60], [-470, 110], [-250, 90], [-60, 160], [180, 70], [340, 120], [560, 100], [760, 150], [980, 60], [1160, 110], [1380, 90]];
const DAPPLES: [number, number, number][] = [[140, 700, 54], [900, 640, 38], [200, 1180, 70], [960, 1000, 46], [820, 1500, 64], [90, 1560, 40], [520, 1700, 52], [980, 1760, 70], [300, 1850, 36], [760, 1860, 44], [60, 930, 30], [1010, 1330, 34]];
const Sky: React.FC<{f: number; prog: number; tone?: 'orange' | 'cream'; alpha?: number}> = ({f, prog, tone = 'orange', alpha = 1}) => {
  const bandCol = tone === 'orange' ? 'rgba(13,11,10,0.105)' : 'rgba(255,91,26,0.075)';
  const dapCol = tone === 'orange' ? 'rgba(255,243,230,0.15)' : 'rgba(255,91,26,0.09)';
  const shift = -prog * 520 + Math.sin(f / 52) * 16 + f * 0.35;
  const thin = 1 - 0.55 * prog;
  return (
    <AbsoluteFill style={{opacity: alpha, overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: -1000, top: -1000, width: 3080, height: 3920, transform: `rotate(-17deg) translateX(${shift}px)`, transformOrigin: '50% 50%'}}>
        {BANDS.map(([x, w], i) => <div key={i} style={{position: 'absolute', left: 1540 + x + (w * (1 - thin)) / 2, top: 0, width: w * thin, height: 3920, background: bandCol}} />)}
      </div>
      {tone === 'orange' && <div style={{position: 'absolute', left: 540 + lerp(-300, 300, prog) - 600, top: 1210 - 600, width: 1200, height: 1200, borderRadius: '50%', background: 'rgba(255,243,230,0.085)'}} />}
      {DAPPLES.map(([x, y, r], i) => (
        <div key={i} style={{position: 'absolute', left: x + Math.sin(f / 70 + i * 1.7) * 18 - r, top: y + Math.cos(f / 83 + i) * 14 - r, width: r * 2, height: r * 2, borderRadius: '50%', background: dapCol, transform: `scale(${0.8 + 0.4 * (0.5 + 0.5 * Math.sin(f / 40 + i * 2.1)) * (0.6 + 0.8 * prog)})`}} />
      ))}
    </AbsoluteFill>
  );
};

/* ---------- UI pages ---------- */
const LearnHero: React.FC<{t: number}> = ({t}) => {
  const f = useFinger(t, [300, 500], [196, 436], 10, 26, 28, 90);
  const playing = t >= 29 && t < 120 ? 1 : 0;
  const a1 = audioEnv(t, 32, 72), a2 = audioEnv(t, 74, 114);
  return (
    <LearnPage title="Time" icon="Time" count="1 of 40 words" pct={1 / 40} chip="EVERYDAY JAPANESE" l1="Japanese" w1="Komorebi" l2="English" w2={HERO} a1={a1} a2={a2} playing={playing} playPress={f.press} t={t}
      pressFinger={<><Finger x={f.x} y={f.y} show={f.show} press={f.press} /><div style={{position: 'absolute', left: 196, top: 436}}>{f.rp}</div></>} />
  );
};

const rowY = (i: number) => 258 + i * 60;
const Playlist: React.FC<{t: number}> = ({t}) => {
  const lists: [string, number][] = [['Nightmare', 33], ['Daily Japanese', 11], ['Fancy Words', 14]];
  const fly = io(t, 12, 30);
  const land = t >= 30 ? ease(t, 30, 38) : 0;
  const bump = t >= 30 && t < 40 ? 1 + 0.08 * Math.sin(((t - 30) / 10) * Math.PI) : 1;
  const f = useFinger(t, [330, 470], [196, rowY(1) + 26], 44, 56, 58, 16);
  const cy = lerp(60, rowY(1) + 26, fly);
  return (
    <>
      <Panel>
        <div style={{position: 'absolute', left: 0, right: 0, top: 18, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, fontFamily: UI, fontWeight: 600, fontSize: 17, letterSpacing: '0.08em', color: '#fff'}}><Body body={GI['s:notebook-bold']} size={22} color="#fff" />MY WORDS</div>
      </Panel>
      <GlassBox x={28} y={64} w={337} h={132} r={16} bg={0.1} blur={6} border={0.2} shadow={false}>
        <Txt x={0} y={46} w={337} size={18} weight={600} align="center">Search Word</Txt>
        <Txt x={0} y={72} w={337} size={13} color={W(0.6)} align="center">Find any word &amp; get translation</Txt>
      </GlassBox>
      <GlassBox x={28} y={208} w={337} h={250} r={16} bg={0.1} blur={6} border={0.2} shadow={false}>
        <div style={{position: 'absolute', left: 16, top: 14, fontFamily: UI, fontWeight: 600, fontSize: 15, color: '#fff'}}>My Playlists</div>
      </GlassBox>
      {lists.map(([n, c], i) => {
        const st = sp(t, 4 + i * 4, {damping: 14, stiffness: 150, mass: 0.7});
        const h = i === 1 ? Math.max(land, t >= 58 ? 1 : 0) : 0;
        const cnt = i === 1 && t >= 30 ? c + 1 : c;
        return (
          <div key={n} style={{position: 'absolute', left: 40, top: rowY(i) + (1 - st) * 20, width: 313, height: 52, borderRadius: 12, background: W(0.06 + 0.16 * h), border: i === 1 && h > 0 ? `1px solid ${W(0.35 * h)}` : '1px solid transparent', boxSizing: 'border-box', opacity: Math.min(1, st * 1.5), transform: `scale(${i === 1 ? bump : 1})`}}>
            <Txt x={16} y={8} size={16} weight={500}>{n}</Txt>
            <Txt x={16} y={29} size={12} color={i === 1 && t >= 30 ? CREAM : W(0.5)}>{cnt} words</Txt>
            <div style={{position: 'absolute', right: 14, top: 14}}><ChevR size={22} color={W(0.5)} /></div>
          </div>
        );
      })}
      {t >= 12 && t < 36 && (
        <div style={{position: 'absolute', left: 196 - 70, top: cy - 20, width: 140, height: 40, borderRadius: 20, background: W(0.28), border: `1.5px solid ${CREAM}`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: UI, fontWeight: 600, fontSize: 17, color: '#fff', backdropFilter: 'blur(8px)', transform: `scale(${1 - 0.15 * fly})`, opacity: 1 - ease(t, 30, 36)}}>Komorebi</div>
      )}
      <Dots cur={7} />
      <Finger x={f.x} y={f.y} show={f.show} press={f.press} /><div style={{position: 'absolute', left: 196, top: rowY(1) + 26}}>{f.rp}</div>
    </>
  );
};

/* ---------- sun with seven rays ---------- */
const TX0 = 380, TX1 = 955, TY = 302;
const Rays: React.FC<{f: number; lit: number[]; r: number}> = ({f, lit, r}) => (
  <>
    {lit.map((p, i) => {
      const a = (i / 7) * Math.PI * 2 - Math.PI / 2 + f / 90;
      const k = p > 0 ? Math.min(1.18, 0.6 + 0.6 * sp(f, LIT[i], {damping: 9, stiffness: 200, mass: 0.6})) : 0.78;
      const r0 = r + 12, r1 = r + 12 + 22 * k;
      return <line key={i} x1={Math.cos(a) * r0} y1={Math.sin(a) * r0} x2={Math.cos(a) * r1} y2={Math.sin(a) * r1} stroke={p > 0 ? CREAM : 'rgba(13,11,10,0.3)'} strokeWidth={p > 0 ? 9 : 6} strokeLinecap="round" />;
    })}
  </>
);

/* ---------- ending ---------- */
const Ending: React.FC<{e: number; f: number}> = ({e, f}) => {
  const icon = sp(e, 30, {damping: 12, stiffness: 120, mass: 0.8});
  const iconImg = ease(e, 40, 56);
  const rad = lerp(150, 66, ease(e, 30, 60));
  const g = sp(e, 52, {damping: 12, stiffness: 140, mass: 0.8});
  const st = ease(e, 68, 82);
  const bd = sp(e, 84, {damping: 12, stiffness: 120, mass: 0.7});
  return (
    <>
      <div style={{position: 'absolute', left: 540 - 150, top: 760 - 150, width: 300, height: 300, borderRadius: rad, overflow: 'hidden', background: ORANGE, opacity: ease(e, 26, 34), transform: `scale(${0.5 + 0.5 * Math.min(1.03, icon)})`, boxShadow: '0 28px 60px rgba(13,11,10,0.2)'}}>
        <Img src={staticFile('app-icon.png')} style={{width: 300, height: 300, opacity: iconImg}} />
      </div>
      <div style={{position: 'absolute', left: 0, top: 985, width: 1080, textAlign: 'center', fontFamily: SORA, fontWeight: 800, fontSize: 168, letterSpacing: -8, color: INK, lineHeight: 1, whiteSpace: 'nowrap', transform: `translateY(${(1 - Math.min(1.04, g)) * 70}px)`, opacity: Math.min(1, g * 1.6)}}>Get Sprind.</div>
      <div style={{position: 'absolute', left: 0, top: 1195, width: 1080, textAlign: 'center', fontFamily: SORA, fontWeight: 700, fontSize: 92, letterSpacing: -3, color: ORANGE, opacity: st, transform: `translateY(${(1 - st) * 30}px)`}}>Start now.</div>
      <Img src={staticFile('app-store-badge.png')} style={{position: 'absolute', left: 540 - 240, top: 1335, height: 142, transform: `scale(${bd}) translateY(${(1 - bd) * 50}px)`, opacity: Math.min(1, bd)}} />
    </>
  );
};

const Main: React.FC = () => {
  const f = useCurrentFrame();
  const e = f - E0;
  const j = S.reduce((a, s, i) => (f >= s ? i : a), 0);
  const t = (jj: number) => f - S[jj];
  const pv = (start: number, end: number) => {
    const inn = interpolate(f, [start, start + 7], [0, 1], clamp);
    const out = interpolate(f, [end - 1, end + 6], [1, 0], clamp);
    const o = Math.min(inn, out);
    return {o, sc: 0.95 + 0.05 * o};
  };
  const vMenu = pv(S[1], S[2]);
  const vLearn = pv(S[2], S[4]);
  const vAuto = pv(S[4], S[5]);
  const vQuiz = pv(S[5], S[6]);
  const vPl = pv(S[6], S[7]);
  const vSt = pv(S[7], E0 + 6);
  const lit = LIT.map((x) => (f >= x ? 1 : 0));
  const nLit = lit.reduce((a, b) => a + b, 0);
  const prog = LIT.reduce((a, x) => a + ease(f, x, x + 16), 0) / 7;
  const enter = sp(f, 0, {damping: 16, stiffness: 110, mass: 0.9});
  const vpOut = ease(e, -2, 10);
  const uiOut = 1 - ease(e, -2, 8);

  // hook
  const hOpen = ease(f, 0, 20) * (1 - io(f, 38, 52));
  const hookText = f < 54;
  const discIn = sp(f, 44, {damping: 13, stiffness: 120, mass: 0.9});
  const fly = io(f, 64, 84);
  // sun disc geometry
  const sunX = TX0 + prog * (TX1 - TX0);
  const sunY = TY - prog * 22;
  const endTravel = io(e, 0, 28);
  let dx = lerp(540, sunX, fly), dy = lerp(405, sunY, fly), dr = lerp(150, 33 + 4 * prog, fly) * (f < 64 ? Math.min(1, discIn) : 1);
  if (e > 0) { dx = lerp(sunX, 540, endTravel); dy = lerp(sunY, 760, endTravel); dr = lerp(37, 150, endTravel); }
  const discText = (1 - ease(f, 64, 74)) * Math.min(1, discIn);
  const showDisc = f >= 44 && f < E0 + 30;
  const flood = ease(e, 26, 50) * 2300;
  const trackO = ease(f, 74, 86) * uiOut;

  const cap = j;
  const [ct, cs] = CAPS[cap];
  const fs = Math.min(80, 940 / (ct.length * 0.52));
  const capT = Math.max(0, f - S[j] - (j === 0 ? 72 - S[0] : 2));
  const capShow = j === 0 ? ease(f, 72, 84) : 1;
  const capOpen = ease(capT, 0, 14);
  const capSub = ease(capT, 8, 22);
  const chipI = nLit - 1;
  const chipPop = nLit > 0 ? sp(f, LIT[nLit - 1], {damping: 10, stiffness: 190, mass: 0.6}) : 1;

  return (
    <AbsoluteFill style={{background: ORANGE}}>
      <Sky f={f} prog={prog} />

      {/* hook type */}
      {hookText && (
        <div style={{position: 'absolute', left: 60, top: 262, width: 960, fontFamily: SORA, fontWeight: 800, fontSize: 112, lineHeight: '132px', letterSpacing: '-0.06em', whiteSpace: 'nowrap', ...slatMask(hOpen, 30)}}>
          <div style={{color: INK}}>One word English</div>
          <div style={{color: CREAM}}>never invented.</div>
        </div>
      )}

      {/* progress track + captions */}
      <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 600, opacity: uiOut}}>
        <svg width={1080} height={400} style={{position: 'absolute', left: 0, top: 0, opacity: trackO}}>
          <line x1={TX0} y1={TY} x2={TX1} y2={TY - 22} stroke="rgba(13,11,10,0.28)" strokeWidth={5} strokeLinecap="round" />
          <line x1={TX0} y1={TY} x2={sunX} y2={sunY} stroke={CREAM} strokeWidth={5} strokeLinecap="round" />
          {[0, 1, 2, 3, 4, 5, 6].map((i) => { const p = (i + 1) / 7; return <circle key={i} cx={TX0 + p * (TX1 - TX0)} cy={TY - p * 22} r={lit[i] ? 7 : 5} fill={lit[i] ? CREAM : 'rgba(13,11,10,0.3)'} />; })}
          <g transform={`translate(${sunX},${sunY})`}><Rays f={f} lit={lit} r={dr} /></g>
        </svg>
        <div style={{position: 'absolute', left: 60, top: 272, height: 60, display: 'flex', alignItems: 'center', gap: 12, fontFamily: SORA, opacity: trackO}}>
          <div style={{minWidth: 72, height: 54, borderRadius: 27, background: INK, color: CREAM, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 26, padding: '0 16px', transform: `scale(${Math.min(1.06, 0.9 + 0.1 * chipPop)})`, whiteSpace: 'nowrap'}}>
            <span style={{opacity: 0.65, marginRight: 10, fontVariantNumeric: 'tabular-nums'}}>{nLit}/7</span>{chipI >= 0 ? CHIPS[chipI] : 'Dawn'}
          </div>
        </div>
        <div style={{position: 'absolute', left: 60, top: 390, width: 960, opacity: capShow}}>
          <div style={{fontWeight: 800, fontSize: fs, lineHeight: '90px', letterSpacing: '-0.055em', color: CREAM, whiteSpace: 'nowrap', fontFamily: SORA, ...slatMask(capOpen, 16)}}>{ct}</div>
          <div style={{fontWeight: 600, fontSize: 38, lineHeight: '48px', letterSpacing: '-0.02em', color: INK, whiteSpace: 'nowrap', marginTop: 6, fontFamily: SORA, opacity: capSub, transform: `translateY(${(1 - capSub) * 14}px)`}}>{cs}</div>
        </div>
      </div>

      {/* phone */}
      <div style={{position: 'absolute', left: VL, top: VT, width: VW, height: VH, borderRadius: 52, overflow: 'hidden', background: INK, boxShadow: `0 0 0 3px ${W(0.25)}, 0 34px 80px rgba(13,11,10,0.3)`, opacity: Math.min(1, enter * 2) * (1 - vpOut), transform: `scale(${(0.94 + 0.06 * Math.min(1, enter)) * (1 - 0.06 * vpOut)})`}}>
        <Img src={staticFile('app/appbg.jpg')} style={{position: 'absolute', left: -(1800 * (4266 / 2400) - VW) * (0.72 + 0.22 * (f / TOTAL)), top: -(1800 - VH) * 0.55, width: 1800 * (4266 / 2400), height: 1800, maxWidth: 'none'}} />
        <div style={{position: 'absolute', left: 0, top: 0, width: LW, height: LH, transformOrigin: '0 0', transform: `scale(${UIS})`}}>
          {j === 0 && <div style={{position: 'absolute', inset: 0}}><PickerPage t={Math.max(0, t(0))} langs={JP} /></div>}
          {vMenu.o > 0.01 && j === 1 && <div style={{position: 'absolute', inset: 0, opacity: vMenu.o, transform: `scale(${vMenu.sc})`}}><MenuPage t={Math.max(0, t(1))} pick={2} /></div>}
          {vLearn.o > 0.01 && j >= 2 && j <= 3 && (
            <div style={{position: 'absolute', inset: 0, opacity: vLearn.o, transform: `scale(${vLearn.sc})`}}>
              {j === 2 ? <LearnHero t={Math.max(0, t(2))} /> : <LearnPage title="Time" icon="Time" count="1 of 40 words" pct={1 / 40} chip="EVERYDAY JAPANESE" l1="Japanese" w1="Komorebi" l2="English" w2={HERO} a1={0} a2={0} playing={0} playPress={0} t={0} />}
            </div>
          )}
          {j === 3 && <SettingsPage t={Math.max(0, t(3))} />}
          {vAuto.o > 0.01 && j === 4 && (() => {
            const lt = Math.max(0, t(4));
            const wi = Math.min(PHRASES.length - 1, Math.max(0, Math.floor((lt - WSTART) / WSTEP)));
            const wt = lt - WSTART - wi * WSTEP;
            const a1 = lt < WSTART ? 0 : audioEnv(Math.max(0, wt), 0, 5), a2 = lt < WSTART ? 0 : audioEnv(Math.max(0, wt), 5, 10);
            return <div style={{position: 'absolute', inset: 0, opacity: vAuto.o, transform: `scale(${vAuto.sc})`}}>
              <LearnPage title="Time" icon="Time" count={`${wi + 2} of 40 words`} pct={(wi + 2) / 40} chip="EVERYDAY JAPANESE" l1="Japanese" w1={PHRASES[wi][0]} l2="English" w2={PHRASES[wi][1]} a1={a1} a2={a2} playing={1} playPress={0} t={lt} />
            </div>;
          })()}
          {vQuiz.o > 0.01 && j === 5 && <div style={{position: 'absolute', inset: 0, opacity: vQuiz.o, transform: `scale(${vQuiz.sc})`}}><QuizPage t={Math.max(0, t(5))} q="Komorebi" opts={['Falling leaves', HERO, 'Morning mist', 'Evening shade']} ci={1} /></div>}
          {vPl.o > 0.01 && j === 6 && <div style={{position: 'absolute', inset: 0, opacity: vPl.o, transform: `scale(${vPl.sc})`}}><Playlist t={Math.max(0, t(6))} /></div>}
          {vSt.o > 0.01 && j === 7 && <div style={{position: 'absolute', inset: 0, opacity: vSt.o, transform: `scale(${vSt.sc})`}}><StatsPage t={Math.max(0, t(7))} lang="Japanese" flag="jp" /></div>}
        </div>
      </div>

      {/* the sun: giant hook disc, then rides the track, then settles into the icon */}
      {showDisc && (
        <div style={{position: 'absolute', left: dx - dr, top: dy - dr, width: dr * 2, height: dr * 2, borderRadius: '50%', background: CREAM, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: SORA, color: INK, overflow: 'hidden'}}>
          <div style={{width: 300, height: 300, flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transform: `scale(${dr / 150})`, opacity: discText}}>
            <div style={{fontWeight: 800, fontSize: 52, letterSpacing: -2.5, lineHeight: '58px'}}>Komorebi</div>
            <div style={{fontWeight: 600, fontSize: 23, lineHeight: '27px', textAlign: 'center', marginTop: 6, color: 'rgba(13,11,10,0.75)'}}>sunlight through<br />leaves</div>
          </div>
        </div>
      )}

      {/* ending: the disc floods the sky cream, then turns into the icon */}
      {e >= 24 && (
        <AbsoluteFill style={{background: CREAM, clipPath: `circle(${flood}px at 540px 760px)`}}>
          <Sky f={f} prog={1} tone="cream" />
          <Ending e={e} f={f} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

export const KomorebiVideo: React.FC = () => {
  const [handle] = useState(() => delayRender('fonts'));
  useEffect(() => {
    const defs: [string, string, any][] = [
      ['SoraV', 'fonts/sora-latin-wght-normal.woff2', {weight: '100 800'}],
      ['SpaceG', 'fonts/space-grotesk-latin-wght-normal.woff2', {weight: '300 700', unicodeRange: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'}],
      ['SpaceG', 'fonts/space-grotesk-latin-ext-wght-normal.woff2', {weight: '300 700', unicodeRange: 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF'}],
    ];
    Promise.all(defs.map(([fam, url, d]) => new FontFace(fam, `url(${staticFile(url)}) format('woff2')`, d).load().then((x) => { (document as any).fonts.add(x); }))).then(() => continueRender(handle)).catch(() => continueRender(handle));
  }, [handle]);
  return (
    <AbsoluteFill style={{background: ORANGE, fontFamily: UI}}>
      <Main />
    </AbsoluteFill>
  );
};
