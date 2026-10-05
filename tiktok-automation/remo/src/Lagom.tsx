import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Easing, Img, delayRender, continueRender, interpolate, spring, staticFile, useCurrentFrame} from 'remotion';
import {S, E0, TOTAL, LIT, OFFS, NAMES, PHRASES, WSTEP, WSTART, PK_RATE, DISAGREE} from './lagomTimeline';
import {LANGS, audioEnv, GlassBox, Txt, Finger, useFinger, ChevR, Panel, Dots, Body, MenuPage, LearnPage, SettingsPage, QuizPage, StatsPage, PickerPage} from './Glass';
import {GI} from './glassIcons';

const ORANGE = '#FF5B1A', INK = '#0D0B0A', CREAM = '#FFF3E6';
const SORA = "'SoraV', sans-serif";
const UI = "'SpaceG', 'SoraV', sans-serif";
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const sp = (f: number, delay: number, cfg = {damping: 12, stiffness: 130, mass: 0.7}) => spring({frame: f - delay, fps: 30, config: cfg});
const E = Easing.bezier(0.16, 1, 0.3, 1);
const ease = (f: number, a: number, b: number) => E(interpolate(f, [a, b], [0, 1], clamp));
const io = (f: number, a: number, b: number) => Easing.inOut(Easing.cubic)(interpolate(f, [a, b], [0, 1], clamp));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const W = (a: number) => `rgba(255,255,255,${a})`;
export const LAGOM_TOTAL = TOTAL;

// layout: caption 262-450, gauge band 520-690, phone 710-1764
const VW = 740, VH = 1054, VL = (1080 - VW) / 2, VT = 710, UIS = VW / 393, LW = 393, LH = 560;
const BT = 520, BH = 170, CX = 540, RANGE = 250;
const PT: [string, string][] = (() => { const a = LANGS.slice(); const ti = a.findIndex((x) => x[0] === 'Swedish'); const tmp = a[41]; a[41] = a[ti]; a[ti] = tmp; return a; })();
const CAPS: [string, string][] = [
  ['Fifty languages.', 'Pick the one that fits.'],
  ['Start with the basics.', 'First Aid Kit. Tap Greetings.'],
  ['Press play.', 'It speaks. You say it back.'],
  ['Trim the pauses.', 'Not too long. Not too short.'],
  ['Hit autoplay.', 'A sorted set, all in one go.'],
  ['Which one is it?', 'One tap. Instant verdict.'],
  ['Put it somewhere safe.', 'Playlists: your words, your order.'],
  ['Watch it add up.', 'Words, streaks, badges.'],
];
const HERO_H = 'Just the right amount';

const LearnHero: React.FC<{t: number}> = ({t}) => {
  const f = useFinger(t, [300, 500], [196, 436], 10, 26, 28, 90);
  const playing = t >= 29 && t < 118 ? 1 : 0;
  const a1 = audioEnv(t, 32, 72), a2 = audioEnv(t, 74, 114);
  return (
    <LearnPage title="Greetings" icon="Greetings" count="1 of 40 words" pct={1 / 40} chip="EVERYDAY SWEDISH" l1="Swedish" w1="Lagom" l2="English" w2={HERO_H} a1={a1} a2={a2} playing={playing} playPress={f.press} t={t}
      pressFinger={<><Finger x={f.x} y={f.y} show={f.show} press={f.press} /><div style={{position: 'absolute', left: 196, top: 436}}>{f.rp}</div></>} />
  );
};

const rowY = (i: number) => 258 + i * 60;
const Playlist: React.FC<{t: number}> = ({t}) => {
  const lists: [string, number][] = [['Nightmare', 33], ['Everyday Swedish', 11], ['Fancy Words', 14]];
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
        <div style={{position: 'absolute', left: 196 - 70, top: cy - 20, width: 140, height: 40, borderRadius: 20, background: W(0.28), border: `1.5px solid ${CREAM}`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: UI, fontWeight: 600, fontSize: 17, color: '#fff', backdropFilter: 'blur(8px)', transform: `scale(${1 - 0.15 * fly})`, opacity: 1 - ease(t, 30, 36)}}>Lagom</div>
      )}
      <Dots cur={7} />
      <Finger x={f.x} y={f.y} show={f.show} press={f.press} /><div style={{position: 'absolute', left: 196, top: rowY(1) + 26}}>{f.rp}</div>
    </>
  );
};

/* marker offset: hook pinned right, swings left on the disagree beat, then each feature settles it closer to centre */
const SETTLE = {damping: 9, stiffness: 120, mass: 0.9};
const offsetAt = (f: number, e: number) => {
  let o = 1;
  const trem = f < DISAGREE ? Math.sin(f * 1.9) * 0.025 * Math.min(1, f / 6) : 0;
  o += (-0.8 - 1) * sp(f, DISAGREE, {damping: 10, stiffness: 90, mass: 1});
  let prev = -0.8;
  LIT.forEach((t, i) => { o += (OFFS[i] - prev) * sp(f, t, SETTLE); prev = OFFS[i]; });
  o += (0 - prev) * sp(e, 8, {damping: 22, stiffness: 320, mass: 0.8});
  return o + trem;
};

const Gauge: React.FC<{f: number; e: number; o: number; endP: number}> = ({f, e, o, endP}) => {
  const ticks = Array.from({length: 21}, (_, i) => i);
  const nDone = LIT.filter((x) => f >= x).length;
  const lastT = nDone > 0 ? LIT[nDone - 1] : 0;
  const tabIn = nDone > 0 ? ease(f, lastT + 2, lastT + 10) : 0;
  const mx = CX + o * RANGE;
  const inZone = Math.abs(o) < 0.14;
  const locked = e >= 8;
  const tabText = locked ? 'Just right' : NAMES[Math.max(0, nDone - 1)];
  const tabCount = locked ? '' : `${nDone}/7`;
  const lbl = 1 - ease(e, 24, 40);
  const hookA = ease(f, 0, 6);
  return (
    <div style={{position: 'absolute', left: 0, top: BT, width: 1080, height: BH, opacity: hookA}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: BH, background: CREAM}} />
      <div style={{position: 'absolute', left: CX - 36, top: 0, width: 72, height: BH, background: ORANGE}} />
      {ticks.map((i) => {
        const major = i % 5 === 0;
        const h = i === 10 ? 96 : major ? 68 : 36;
        return <div key={i} style={{position: 'absolute', left: CX - RANGE + i * 25 - 3, top: BH / 2 - h / 2, width: 6, height: h, borderRadius: 3, background: INK, opacity: i === 10 ? 1 : 0.8}} />;
      })}
      <div style={{position: 'absolute', left: 44, top: 0, height: BH, display: 'flex', alignItems: 'center', fontFamily: SORA, fontWeight: 800, fontSize: 30, letterSpacing: '-0.01em', color: INK, opacity: 0.55 * lbl}}>TOO LITTLE</div>
      <div style={{position: 'absolute', right: 44, top: 0, height: BH, display: 'flex', alignItems: 'center', fontFamily: SORA, fontWeight: 800, fontSize: 30, letterSpacing: '-0.01em', color: INK, opacity: 0.55 * lbl}}>TOO MUCH</div>
      <div style={{position: 'absolute', left: mx - 9, top: 22, width: 18, height: BH - 44, borderRadius: 9, background: INK, boxShadow: inZone ? `0 0 0 5px ${CREAM}, 0 0 0 9px ${INK}` : 'none'}} />
      {(tabIn > 0.01 || locked) && (
        <div style={{position: 'absolute', left: mx - 110, top: -58, width: 220, height: 58, borderRadius: '20px 20px 0 0', background: CREAM, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, fontFamily: SORA, fontWeight: 700, fontSize: 30, letterSpacing: '-0.02em', color: INK, opacity: locked ? 1 : tabIn, transform: `translateY(${locked ? 0 : (1 - tabIn) * 14}px)`, whiteSpace: 'nowrap'}}>
          {tabText}{tabCount && <span style={{fontWeight: 800, fontSize: 24, color: ORANGE}}>{tabCount}</span>}
        </div>
      )}
    </div>
  );
};

/* ---------- ending: the field settles to cream around the gauge, icon locks into an orange block ---------- */
const Ending: React.FC<{e: number}> = ({e}) => {
  const ib = sp(e, 42, {damping: 13, stiffness: 150, mass: 0.8});
  const g = sp(e, 56, {damping: 14, stiffness: 140, mass: 0.8});
  const st = ease(e, 76, 88);
  const bd = sp(e, 96, {damping: 14, stiffness: 120, mass: 0.7});
  return (
    <>
      <div style={{position: 'absolute', left: CX - 165, top: 750, width: 330, height: 330, borderRadius: 76, background: INK, transform: `scale(${Math.min(1.03, ib)})`, opacity: Math.min(1, ib * 1.6), display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <Img src={staticFile('app-icon.png')} style={{width: 250, height: 250, borderRadius: 58}} />
      </div>
      <div style={{position: 'absolute', left: 0, top: 1100, width: 1080, textAlign: 'center', fontFamily: SORA, fontWeight: 800, fontSize: 160, letterSpacing: -5, color: INK, lineHeight: 1, whiteSpace: 'nowrap', transform: `translateY(${(1 - Math.min(1, g)) * 40}px)`, opacity: Math.min(1, g * 1.6)}}>Get Sprind.</div>
      <div style={{position: 'absolute', left: 0, top: 1296, width: 1080, display: 'flex', justifyContent: 'center', opacity: st, transform: `translateY(${(1 - st) * 24}px)`}}>
        <div style={{padding: '8px 56px 14px', borderRadius: 24, background: ORANGE, fontFamily: SORA, fontWeight: 700, fontSize: 70, letterSpacing: -2, color: INK}}>Start now.</div>
      </div>
      <Img src={staticFile('app-store-badge.png')} style={{position: 'absolute', left: 540 - 168, top: 1428, height: 112, transform: `scale(${bd})`, opacity: Math.min(1, bd)}} />
    </>
  );
};

const Main: React.FC = () => {
  const f = useCurrentFrame();
  const e = f - E0;
  const j = S.reduce((a, s, i) => (f >= s ? i : a), -1);
  const t = (jj: number) => f - S[jj];
  const pv = (start: number, end: number) => {
    const inn = interpolate(f, [start, start + 7], [0, 1], clamp);
    const out = interpolate(f, [end - 1, end + 6], [1, 0], clamp);
    const o = Math.min(inn, out);
    return {o, sc: 0.95 + 0.05 * o};
  };
  const vPk = pv(-10, S[1]);
  const vMenu = pv(S[1], S[2]);
  const vLearn = pv(S[2], S[4]);
  const vAuto = pv(S[4], S[5]);
  const vQuiz = pv(S[5], S[6]);
  const vPl = pv(S[6], S[7]);
  const vSt = pv(S[7], E0 + 6);
  const zoom = j === 2 ? ease(t(2), 4, 70) * (1 - ease(t(2), 120, 126)) : 0;
  const enter = sp(f, 0, {damping: 16, stiffness: 110, mass: 0.9});
  const zm = 1.03, fx = 196, fy = 300;
  const sc = UIS * (1 + (zm - 1) * zoom);
  const tx = lerp(fx * UIS, VW / 2, zoom) - fx * sc, ty = lerp(fy * UIS, fy * UIS, zoom) - fy * sc;
  const bgH = 1800, bgW = bgH * (4266 / 2400);
  const bgX = -(bgW - VW) * (0.72 + 0.22 * (f / TOTAL));
  const bgY = -(bgH - VH) * 0.55;
  const vpOut = ease(e, -2, 10);
  const o = offsetAt(f, e);
  const endP = ease(e, 12, 42);
  const field = 85 + endP * 1500;

  // hook plate
  const plateOut = ease(f, 98, 110);
  const flip = ease(f, DISAGREE, DISAGREE + 5);
  const hw = ['Everyone', 'says', 'more', 'is', 'better.'];
  const hwT = [3, 11, 19, 27, 34];
  const capIdx = (i: number) => {
    const a = i === 0 ? 106 : S[i] + 2;
    const b = i === 7 ? E0 + 2 : S[i + 1] + 2;
    const inn = interpolate(f, [a, a + 8], [0, 1], clamp);
    const out = interpolate(f, [b - 4, b + 3], [1, 0], clamp);
    return {a, p: Math.min(inn, out), up: (1 - ease(f, a, a + 10)) * 26};
  };
  const hL = 480 - 380 * o, hR = 480 + 380 * o;
  const slabsOut = 1 - ease(e, 20, 40);

  return (
    <AbsoluteFill style={{background: INK}}>
      {/* see-saw slabs */}
      <div style={{position: 'absolute', left: 0, top: 1920 - Math.max(60, hL), width: 126, height: 2000, background: CREAM, opacity: slabsOut}} />
      <div style={{position: 'absolute', right: 0, top: 1920 - Math.max(60, hR), width: 126, height: 2000, background: ORANGE, opacity: slabsOut}} />

      {/* ending field: cream grows out of the gauge band */}
      {e > -2 && <div style={{position: 'absolute', left: 0, width: 1080, top: BT + BH / 2 - field, height: field * 2, background: CREAM}} />}

      {/* hook plate */}
      {f < 114 && (
        <div style={{position: 'absolute', left: 0, top: 236, width: 1080, height: 270 * (1 - plateOut), overflow: 'hidden', background: flip > 0.5 ? CREAM : ORANGE}}>
          <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 270, opacity: 1 - ease(f, 94, 102)}}>
          {flip < 0.5 && (
            <>
              <div style={{position: 'absolute', left: 60, top: 14, display: 'flex', gap: 22, fontFamily: SORA, fontWeight: 700, fontSize: 64, letterSpacing: '-0.04em', color: INK}}>
                {hw.slice(0, 2).map((w, i) => <span key={w} style={{opacity: ease(f, hwT[i], hwT[i] + 5), transform: `translateY(${(1 - ease(f, hwT[i], hwT[i] + 6)) * 18}px)`}}>{w}</span>)}
              </div>
              <div style={{position: 'absolute', left: 54, top: 86, display: 'flex', gap: 26, fontFamily: SORA, fontWeight: 800, fontSize: 112, lineHeight: '140px', letterSpacing: '-0.06em', color: INK, whiteSpace: 'nowrap'}}>
                {hw.slice(2).map((w, i) => { const k = i + 2; const a = ease(f, hwT[k], hwT[k] + 5); return <span key={w} style={{opacity: a, transform: `translateY(${(1 - a) * 20}px) scale(${0.9 + 0.1 * a})`, transformOrigin: '0 100%'}}>{w}</span>; })}
              </div>
            </>
          )}
          {flip >= 0.5 && (
            <>
              <div style={{position: 'absolute', left: 54, top: 6, fontFamily: SORA, fontWeight: 800, fontSize: 150, lineHeight: '160px', letterSpacing: '-0.07em', color: INK, whiteSpace: 'nowrap', opacity: ease(f, DISAGREE + 3, DISAGREE + 9), transform: `translateY(${(1 - ease(f, DISAGREE + 3, DISAGREE + 10)) * 20}px)`}}>Lagom</div>
              <div style={{position: 'absolute', left: 60, top: 160, fontFamily: SORA, fontWeight: 700, fontSize: 92, lineHeight: '100px', letterSpacing: '-0.05em', color: ORANGE, whiteSpace: 'nowrap', opacity: ease(f, DISAGREE + 12, DISAGREE + 18), transform: `translateY(${(1 - ease(f, DISAGREE + 12, DISAGREE + 19)) * 20}px)`}}>disagrees.</div>
            </>
          )}
          </div>
        </div>
      )}

      {/* captions */}
      {CAPS.map(([ct, cs], i) => {
        const c = capIdx(i);
        if (c.p <= 0.01) return null;
        const fs = Math.min(92, 960 / (ct.length * 0.56));
        return (
          <div key={i} style={{position: 'absolute', left: 0, top: 262, width: 1080, textAlign: 'center', opacity: c.p, transform: `translateY(${c.up}px)`}}>
            <div style={{fontFamily: SORA, fontWeight: 800, fontSize: fs, lineHeight: '104px', letterSpacing: "-0.045em", color: CREAM, whiteSpace: 'nowrap'}}>{ct}</div>
            <div style={{display: 'flex', justifyContent: 'center', marginTop: 16}}>
              <div style={{padding: '6px 28px 10px', borderRadius: 18, background: ORANGE, fontFamily: SORA, fontWeight: 600, fontSize: 34, letterSpacing: '-0.02em', color: INK, whiteSpace: 'nowrap'}}>{cs}</div>
            </div>
          </div>
        );
      })}

      <Gauge f={f} e={e} o={o} endP={endP} />

      <div style={{position: 'absolute', left: VL, top: VT, width: VW, height: VH, borderRadius: 48, overflow: 'hidden', background: INK, boxShadow: `0 0 0 6px ${CREAM}`, opacity: Math.min(1, enter * 2) * (1 - vpOut), transform: `scale(${(0.94 + 0.06 * Math.min(1, enter)) * (1 - 0.06 * vpOut)})`, display: e > 12 ? 'none' : 'block'}}>
        <Img src={staticFile('app/appbg.jpg')} style={{position: 'absolute', left: bgX, top: bgY, width: bgW, height: bgH, maxWidth: 'none'}} />
        <div style={{position: 'absolute', left: 0, top: 0, width: LW, height: LH, transformOrigin: '0 0', transform: `translate(${tx}px,${ty}px) scale(${sc})`}}>
          {j <= 0 && vPk.o > 0.01 && <div style={{position: 'absolute', inset: 0, opacity: vPk.o, transform: `scale(${vPk.sc})`}}><PickerPage t={Math.max(0, f) * PK_RATE} langs={PT} /></div>}
          {vMenu.o > 0.01 && j === 1 && <div style={{position: 'absolute', inset: 0, opacity: vMenu.o, transform: `scale(${vMenu.sc})`}}><MenuPage t={Math.max(0, t(1))} pick={0} /></div>}
          {vLearn.o > 0.01 && j >= 2 && j <= 3 && (
            <div style={{position: 'absolute', inset: 0, opacity: vLearn.o, transform: `scale(${vLearn.sc})`}}>
              {j === 2 ? <LearnHero t={Math.max(0, t(2))} /> : <LearnPage title="Greetings" icon="Greetings" count="1 of 40 words" pct={1 / 40} chip="EVERYDAY SWEDISH" l1="Swedish" w1="Lagom" l2="English" w2={HERO_H} a1={0} a2={0} playing={0} playPress={0} t={0} />}
            </div>
          )}
          {j === 3 && <SettingsPage t={Math.max(0, t(3))} />}
          {vAuto.o > 0.01 && j === 4 && (() => {
            const lt = Math.max(0, t(4));
            const wi = Math.min(PHRASES.length - 1, Math.max(0, Math.floor((lt - WSTART) / WSTEP)));
            const wt = lt - WSTART - wi * WSTEP;
            const a1 = lt < WSTART ? 0 : audioEnv(Math.max(0, wt), 0, 5), a2 = lt < WSTART ? 0 : audioEnv(Math.max(0, wt), 5, 10);
            return <div style={{position: 'absolute', inset: 0, opacity: vAuto.o, transform: `scale(${vAuto.sc})`}}>
              <LearnPage title="Greetings" icon="Greetings" count={`${wi + 1} of 40 words`} pct={(wi + 1) / 40} chip="EVERYDAY SWEDISH" l1="Swedish" w1={PHRASES[wi][0]} l2="English" w2={PHRASES[wi][1]} a1={a1} a2={a2} playing={1} playPress={0} t={lt} />
            </div>;
          })()}
          {vQuiz.o > 0.01 && j === 5 && <div style={{position: 'absolute', inset: 0, opacity: vQuiz.o, transform: `scale(${vQuiz.sc})`}}><QuizPage t={Math.max(0, t(5))} q="Lagom" opts={['Too much', 'Almost nothing', HERO_H, 'All or nothing']} ci={2} /></div>}
          {vPl.o > 0.01 && j === 6 && <div style={{position: 'absolute', inset: 0, opacity: vPl.o, transform: `scale(${vPl.sc})`}}><Playlist t={Math.max(0, t(6))} /></div>}
          {vSt.o > 0.01 && j === 7 && <div style={{position: 'absolute', inset: 0, opacity: vSt.o, transform: `scale(${vSt.sc})`}}><StatsPage t={Math.max(0, t(7))} lang="Swedish" flag="se" /></div>}
        </div>
      </div>

      {e >= 0 && <Ending e={e} />}
    </AbsoluteFill>
  );
};

export const LagomVideo: React.FC = () => {
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
    <AbsoluteFill style={{background: INK, fontFamily: UI}}>
      <Main />
    </AbsoluteFill>
  );
};
