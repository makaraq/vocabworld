import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Easing, Img, delayRender, continueRender, interpolate, spring, staticFile, useCurrentFrame} from 'remotion';
import {S, E0, TOTAL, LIT, PHRASES, WSTEP, WSTART} from './chouetteTimeline';
import {LANGS, audioEnv, GlassBox, Txt, Finger, useFinger, ChevR, Panel, Dots, Body, MenuPage, LearnPage, SettingsPage, QuizPage, StatsPage, PickerPage} from './Glass';
import {GI} from './glassIcons';

const ORANGE = '#FF5B1A', INK = '#0D0B0A', CREAM = '#FFF3E6';
const SORA = "'SoraV', sans-serif";
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const sp = (f: number, delay: number, cfg = {damping: 12, stiffness: 130, mass: 0.7}) => spring({frame: f - delay, fps: 30, config: cfg});
const E = Easing.bezier(0.16, 1, 0.3, 1);
const ease = (f: number, a: number, b: number) => E(interpolate(f, [a, b], [0, 1], clamp));
const io = (f: number, a: number, b: number) => Easing.inOut(Easing.cubic)(interpolate(f, [a, b], [0, 1], clamp));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const W = (a: number) => `rgba(255,255,255,${a})`;
export const CHOUETTE_TOTAL = TOTAL;

const S0 = S[0];
const VL = 107, VT = 618, VW = 865, VH = 1232, UIS = VW / 393, LW = 393, LH = 560;
const HERO = 'Chouette !';
const PT: [string, string][] = (() => { const a = LANGS.slice(); const ti = a.findIndex((x) => x[0] === 'French'); const tmp = a[41]; a[41] = a[ti]; a[ti] = tmp; return a; })();
const CAPS: [string, string][] = [
  ['Fifty postmarks.', 'Fifty languages, one tap. French today.'],
  ['First Aid Kit.', 'Greetings holds the everyday phrases.'],
  ['Hear it. Say it.', 'Neat, lovely. Literally: an owl.'],
  ['Shrink the pauses.', 'Long gaps down to short ones.'],
  ['Now let it run.', 'Autoplay: the whole set, one go.'],
  ['Did it stick?', 'One tap. Instant answer.'],
  ['Keep the good ones.', 'Chouette moves into a playlist.'],
  ['Watch it add up.', 'Words, streaks, badges.'],
];
const STAMP_ICON = ['translation-bold', 'medical-kit-bold', 'play-circle-bold', 'soundwave-bold', 'check-circle-bold', 'playlist-bold', 'chart-2-bold'];

/* ---------- stamp ---------- */
const SW = 104, SH = 126, SGAP = 24, SX0 = (1080 - (7 * SW + 6 * SGAP)) / 2, SY0 = 250;
const sx = (k: number) => SX0 + k * (SW + SGAP);
const Perf: React.FC<{w: number; h: number; bg: string}> = ({w, h, bg}) => {
  const nx = Math.round(w / 15), ny = Math.round(h / 15);
  const dots: [number, number][] = [];
  for (let i = 0; i <= nx; i++) { dots.push([(i * w) / nx, 0]); dots.push([(i * w) / nx, h]); }
  for (let i = 1; i < ny; i++) { dots.push([0, (i * h) / ny]); dots.push([w, (i * h) / ny]); }
  return <>{dots.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={5.2} fill={bg} />)}</>;
};
const StampArt: React.FC<{k: number}> = ({k}) => (
  <svg width={SW} height={SH} viewBox={`0 0 ${SW} ${SH}`} style={{display: 'block', overflow: 'visible'}}>
    <rect x={0} y={0} width={SW} height={SH} fill={ORANGE} />
    <rect x={10} y={10} width={SW - 20} height={SH - 20} fill="none" stroke={CREAM} strokeWidth={2.5} opacity={0.75} />
    <Perf w={SW} h={SH} bg={CREAM} />
    <g transform={`translate(${SW / 2 - 25},${SH / 2 - 33})`}><Body body={GI['s:' + STAMP_ICON[k]]} size={50} color={CREAM} /></g>
    <text x={SW / 2} y={SH - 19} textAnchor="middle" fontFamily={SORA} fontWeight={800} fontSize={17} fill={CREAM} opacity={0.9}>{k + 1}/7</text>
  </svg>
);
const Slot: React.FC<{k: number}> = ({k}) => (
  <div style={{position: 'relative', width: SW, height: SH}}>
    <svg width={SW} height={SH} style={{position: 'absolute', inset: 0, overflow: 'visible'}}><rect x={1.5} y={1.5} width={SW - 3} height={SH - 3} rx={4} fill="none" stroke={INK} strokeWidth={3} strokeDasharray="9 7" opacity={0.28} /></svg>
    <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SORA, fontWeight: 800, fontSize: 40, color: INK, opacity: 0.18}}>{k + 1}</div>
  </div>
);

/* ---------- handwritten Sora ---------- */
const rnd = (i: number, s: number) => { const x = Math.sin(i * 78.233 + s * 12.9898) * 43758.5453; return x - Math.floor(x); };
const HandWord: React.FC<{text: string; size: number; color: string; p?: number; weight?: number}> = ({text, size, color, p = 1, weight = 600}) => (
  <div style={{display: 'inline-block', whiteSpace: 'nowrap', fontFamily: SORA, fontWeight: weight, fontSize: size, lineHeight: 1.15, letterSpacing: '-0.035em', color, transform: 'skewX(-9deg) rotate(-2.5deg)', clipPath: `inset(-20% ${(1 - p) * 104}% -20% -6%)`}}>
    {text.split('').map((c, i) => <span key={i} style={{display: 'inline-block', whiteSpace: 'pre', transform: `translateY(${(rnd(i, 1) - 0.5) * size * 0.07}px) rotate(${(rnd(i, 2) - 0.5) * 5}deg)`}}>{c}</span>)}
  </div>
);
const Scribble: React.FC<{w: number; p: number; color?: string; sw?: number}> = ({w, p, color = INK, sw = 8}) => (
  <svg width={w} height={36} viewBox={`0 0 ${w} 36`} style={{display: 'block', overflow: 'visible'}}>
    <path d={`M6 22 C ${w * 0.18} 6, ${w * 0.35} 30, ${w * 0.55} 14 S ${w * 0.88} 22, ${w - 6} 8`} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
  </svg>
);

/* ---------- phone pages (clones of the Magari structure) ---------- */
const LearnHero: React.FC<{t: number}> = ({t}) => {
  const f = useFinger(t, [300, 500], [196, 436], 10, 26, 28, 90);
  const playing = t >= 29 && t < 118 ? 1 : 0;
  const a1 = audioEnv(t, 32, 72), a2 = audioEnv(t, 74, 114);
  return (
    <LearnPage title="Greetings" icon="Greetings" count="1 of 40 phrases" pct={1 / 40} chip="EVERYDAY FRENCH" l1="French" w1={HERO} l2="English" w2="Neat! / Lovely!" a1={a1} a2={a2} playing={playing} playPress={f.press} t={t}
      pressFinger={<><Finger x={f.x} y={f.y} show={f.show} press={f.press} /><div style={{position: 'absolute', left: 196, top: 436}}>{f.rp}</div></>} />
  );
};
const rowY = (i: number) => 258 + i * 60;
const Playlist: React.FC<{t: number}> = ({t}) => {
  const lists: [string, number][] = [['Nightmare', 33], ['Everyday French', 11], ['Fancy Words', 14]];
  const fly = io(t, 12, 30);
  const land = t >= 30 ? ease(t, 30, 38) : 0;
  const bump = t >= 30 && t < 40 ? 1 + 0.08 * Math.sin(((t - 30) / 10) * Math.PI) : 1;
  const f = useFinger(t, [330, 470], [196, rowY(1) + 26], 44, 56, 58, 14);
  const cy = lerp(60, rowY(1) + 26, fly);
  const UI = "'SpaceG', 'SoraV', sans-serif";
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
            <Txt x={16} y={29} size={12} color={i === 1 && t >= 30 ? CREAM : W(0.5)}>{cnt} phrases</Txt>
            <div style={{position: 'absolute', right: 14, top: 14}}><ChevR size={22} color={W(0.5)} /></div>
          </div>
        );
      })}
      {t >= 12 && t < 36 && (
        <div style={{position: 'absolute', left: 196 - 70, top: cy - 20, width: 140, height: 40, borderRadius: 20, background: W(0.28), border: `1.5px solid ${CREAM}`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: UI, fontWeight: 600, fontSize: 17, color: '#fff', backdropFilter: 'blur(8px)', transform: `scale(${1 - 0.15 * fly})`, opacity: 1 - ease(t, 30, 36)}}>{HERO}</div>
      )}
      <Dots cur={7} />
      <Finger x={f.x} y={f.y} show={f.show} press={f.press} /><div style={{position: 'absolute', left: 196, top: rowY(1) + 26}}>{f.rp}</div>
    </>
  );
};

/* ---------- ending: postcard into the mailbox ---------- */
const CX = 280, CY = 290, CW = 520, CH = 360, SLIT = 760, DROP = 480;
const MB = {x: 300, y: 700, w: 480, h: 390};
const stampTarget = (k: number, d: number) => ({x: CX + 26 + k * 56, y: CY + CH - 84 + d});
const Airmail: React.FC<{w: number; h: number; t?: number}> = ({w, h, t = 16}) => (
  <div style={{position: 'absolute', inset: 0, background: `repeating-linear-gradient(135deg, ${ORANGE} 0 18px, ${CREAM} 18px 30px, ${INK} 30px 48px, ${CREAM} 48px 60px)`}} />
);
const Card: React.FC<{p: number}> = ({p}) => (
  <div style={{position: 'absolute', left: 0, top: 0, width: CW, height: CH, background: CREAM, boxShadow: `0 0 0 3px ${INK}`}}>
    <Airmail w={CW} h={CH} />
    <div style={{position: 'absolute', left: 16, top: 16, right: 16, bottom: 16, background: CREAM}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 76, display: 'flex', justifyContent: 'center'}}><HandWord text={HERO} size={78} color={ORANGE} p={p} /></div>
      <div style={{position: 'absolute', left: 36, top: 190, width: 330, height: 0, borderTop: `3px dotted ${INK}`, opacity: 0.25}} />
      <div style={{position: 'absolute', left: 36, top: 224, width: 250, height: 0, borderTop: `3px dotted ${INK}`, opacity: 0.25}} />
      <div style={{position: 'absolute', right: 26, top: 214, width: 96, height: 96, borderRadius: 48, border: `4px solid ${INK}`, opacity: 0.55, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(-12deg)'}}><div style={{width: 62, height: 62, borderRadius: 31, border: `3px solid ${INK}`}} /></div>
    </div>
  </div>
);
const Ending: React.FC<{e: number}> = ({e}) => {
  const cardIn = ease(e, 0, 14);
  const d = DROP * io(e, 36, 64);
  const sq = e >= 64 ? 1 + 0.045 * Math.sin(Math.min(1, (e - 64) / 12) * Math.PI) : 1;
  const ic = sp(e, 66, {damping: 11, stiffness: 120, mass: 0.9});
  const iconTop = lerp(730, 380, Math.min(1.05, ic));
  const g = sp(e, 88, {damping: 11, stiffness: 140, mass: 0.8});
  const st = ease(e, 102, 116);
  const bd = sp(e, 118, {damping: 12, stiffness: 120, mass: 0.7});
  return (
    <>
      {/* icon (behind the box so it emerges from the top) */}
      <Img src={staticFile('app-icon.png')} style={{position: 'absolute', left: 540 - 110, top: iconTop, width: 220, height: 220, borderRadius: 50, opacity: ic > 0.02 ? 1 : 0}} />
      {/* mailbox */}
      <div style={{position: 'absolute', left: MB.x, top: MB.y, width: MB.w, height: MB.h, transform: `scale(${sq}, ${2 - sq})`, transformOrigin: '50% 100%'}}>
        <div style={{position: 'absolute', inset: 0, background: ORANGE, borderRadius: 48, boxShadow: `0 0 0 4px ${INK}`, overflow: 'hidden'}}>
          <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 34, background: `repeating-linear-gradient(135deg, ${INK} 0 18px, ${CREAM} 18px 30px)`}} />
          <div style={{position: 'absolute', left: 150, top: 200, width: 180, height: 96, borderRadius: 14, background: CREAM, border: `4px solid ${INK}`, boxSizing: 'border-box'}}>
            <div style={{position: 'absolute', left: 20, top: 24, width: 100, height: 8, borderRadius: 4, background: INK, opacity: 0.8}} />
            <div style={{position: 'absolute', left: 20, top: 46, width: 140, height: 8, borderRadius: 4, background: INK, opacity: 0.3}} />
          </div>
        </div>
        <div style={{position: 'absolute', left: 60, top: SLIT - MB.y - 11, width: 360, height: 24, borderRadius: 12, background: INK}} />
      </div>
      {/* postcard + stamps, clipped at the slit so they slide in */}
      <div style={{position: 'absolute', inset: 0, clipPath: `inset(0 0 ${1920 - (SLIT - 2)}px 0)`}}>
        <div style={{position: 'absolute', left: CX, top: CY + d, opacity: cardIn, transform: `scale(${0.92 + 0.08 * cardIn}) rotate(${-2 * (1 - io(e, 24, 40))}deg)`}}><Card p={ease(e, 16, 30)} /></div>
      </div>
      <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, pointerEvents: 'none'}} />
      <div style={{position: 'absolute', left: 0, top: 1130, width: 1080, textAlign: 'center', fontFamily: SORA, fontWeight: 800, fontSize: 150, letterSpacing: -7, color: INK, lineHeight: 1, whiteSpace: 'nowrap', transform: `translateY(${(1 - Math.min(1.04, g)) * 70}px) scale(${Math.min(1, 0.92 + 0.08 * g)})`, opacity: Math.min(1, g * 1.6)}}>Get Sprind.</div>
      <div style={{position: 'absolute', left: 0, top: 1290, width: 1080, textAlign: 'center', fontFamily: SORA, fontWeight: 600, fontSize: 88, letterSpacing: -3, color: ORANGE, opacity: st, transform: `translateY(${(1 - st) * 30}px)`}}>Start now.</div>
      <Img src={staticFile('app-store-badge.png')} style={{position: 'absolute', left: 540 - 205, top: 1405, height: 122, transform: `scale(${bd})`, opacity: Math.min(1, bd)}} />
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
  const vPk = pv(S0 - 6, S[1]);
  const vMenu = pv(S[1], S[2]);
  const vLearn = pv(S[2], S[4]);
  const vAuto = pv(S[4], S[5]);
  const vQuiz = pv(S[5], S[6]);
  const vPl = pv(S[6], S[7]);
  const vSt = pv(S[7], E0 + 6);
  const zoom = 0;
  const zm = 1.0, fx = 196, fy = 300;
  const sc = UIS * (1 + (zm - 1) * zoom);
  const tx = lerp(fx * UIS, VW / 2, zoom) - fx * sc, ty = lerp(fy * UIS, VH / 2 - 40, zoom) - fy * sc;
  const bgH = 1800, bgW = bgH * (4266 / 2400);
  const bgX = -(bgW - VW) * (0.72 + 0.22 * (f / TOTAL));
  const bgY = -(bgH - VH) * 0.55;
  const frameIn = ease(f, S0 - 6, S0 + 8);
  const frameOut = ease(e, -2, 8);
  const hookOut = ease(f, 66, 82);
  const cap = Math.max(0, j);
  const [ct, cs] = CAPS[cap];
  const fs = Math.min(80, 900 / (ct.length * 0.58));
  const capIn = j >= 0 ? sp(f, S[j], {damping: 14, stiffness: 150, mass: 0.7}) : 0;
  const capOut = 1 - ease(e, -2, 6);
  const sub = ease(f, S[cap] + 6, S[cap] + 22);

  // hero word: hook position -> postcard tag
  const hp = io(f, 70, 92);
  const hx = lerp(540, 800, hp), hy = lerp(1210, 604, hp), hs = lerp(1, 0.386, hp);
  const heroIn = ease(f, 46, 68);
  const tagOp = ease(f, 82, 94) * (1 - ease(e, -2, 6));
  const heroOp = 1 - ease(e, -2, 4);
  // hook cards
  const aIn = sp(f, 6, {damping: 14, stiffness: 130, mass: 0.8});
  const strike = ease(f, 28, 38);
  const bIn = sp(f, 40, {damping: 13, stiffness: 150, mass: 0.8});
  const tuned = j === 3 ? ease(t(3), 82, 92) : 0;

  const stampPos = (k: number) => {
    if (e < 0) return {x: sx(k), y: SY0, s: 1, r: k % 2 ? 1.6 : -1.6};
    const p = io(e, 3 + k * 1, 18 + k * 1);
    const d = DROP * io(e, 36, 64);
    const tg = stampTarget(k, d);
    return {x: lerp(sx(k), tg.x, p), y: lerp(SY0, tg.y, p), s: lerp(1, 0.46, p), r: lerp(k % 2 ? 1.6 : -1.6, 0, p)};
  };

  return (
    <AbsoluteFill style={{background: CREAM}}>
      {/* airmail edge */}
      <div style={{position: 'absolute', inset: 0, background: `repeating-linear-gradient(135deg, ${ORANGE} 0 22px, ${CREAM} 22px 36px, ${INK} 36px 58px, ${CREAM} 58px 72px)`}} />
      <div style={{position: 'absolute', inset: 18, background: CREAM}} />

      {/* HOOK */}
      {f < 96 && (
        <div style={{position: 'absolute', inset: 0, opacity: 1 - hookOut}}>
          <div style={{position: 'absolute', left: 96, top: 250}}>
            {['Textbooks skip', 'this word.'].map((l, i) => {
              const a = sp(f, 2 + i * 8, {damping: 15, stiffness: 150, mass: 0.7});
              return <div key={i} style={{fontFamily: SORA, fontWeight: 800, fontSize: 108, lineHeight: '114px', letterSpacing: '-0.055em', color: i ? ORANGE : INK, whiteSpace: 'nowrap', opacity: Math.min(1, a * 1.5), transform: `translateY(${(1 - Math.min(1, a)) * 40}px)`}}>{l}</div>;
            })}
          </div>
          <div style={{position: 'absolute', left: 100, top: 490, fontFamily: SORA, fontWeight: 500, fontSize: 42, letterSpacing: '-0.02em', color: INK, opacity: 0.75 * ease(f, 14, 26)}}>French people say it every day.</div>
          {/* A: textbook */}
          <div style={{position: 'absolute', left: 150, top: 640, width: 780, height: 270, background: CREAM, boxShadow: `0 0 0 4px ${INK}, 14px 14px 0 ${INK}`, transform: `translateY(${(1 - Math.min(1, aIn)) * 70}px) rotate(-2deg) scale(${1 - 0.04 * strike})`, opacity: Math.min(1, aIn * 1.5) * (1 - 0.45 * strike)}}>
            <div style={{position: 'absolute', left: 32, top: 24, fontFamily: SORA, fontWeight: 700, fontSize: 28, letterSpacing: '0.14em', color: INK, opacity: 0.55}}>THE TEXTBOOK</div>
            <div style={{position: 'absolute', left: 0, right: 0, top: 80, textAlign: 'center', fontFamily: SORA, fontWeight: 800, fontSize: 112, letterSpacing: '-0.05em', color: INK, whiteSpace: 'nowrap'}}>Très bien.</div>
            <div style={{position: 'absolute', left: 0, right: 0, top: 218, textAlign: 'center', fontFamily: SORA, fontWeight: 500, fontSize: 34, color: INK, opacity: 0.55}}>= Very good.</div>
            <div style={{position: 'absolute', left: 20, top: 128, width: 740 * strike, height: 14, background: ORANGE, transform: 'rotate(-2deg)', transformOrigin: '0 50%'}} />
          </div>
          {/* B: real life */}
          <div style={{position: 'absolute', left: 90, top: 960, width: 900, height: 560, background: CREAM, boxShadow: `0 0 0 5px ${INK}, 16px 16px 0 ${ORANGE}`, transform: `translateY(${(1 - Math.min(1, bIn)) * 90}px) rotate(1.2deg) scale(${0.94 + 0.06 * Math.min(1, bIn)})`, opacity: Math.min(1, bIn * 1.6) * (1 - ease(f, 68, 78))}}>
            <div style={{position: 'absolute', left: 36, top: 30, padding: '6px 22px 8px', background: ORANGE, borderRadius: 40, fontFamily: SORA, fontWeight: 800, fontSize: 30, letterSpacing: '0.1em', color: CREAM}}>REAL LIFE</div>
            <div style={{position: 'absolute', left: 0, right: 0, top: 385, display: 'flex', justifyContent: 'center', opacity: ease(f, 62, 70) < 0.5 ? ease(f, 60, 66) : 1 - ease(f, 68, 76)}}>
              <div style={{padding: '8px 30px 12px', border: `4px solid ${INK}`, borderRadius: 50, fontFamily: SORA, fontWeight: 600, fontSize: 44, color: INK}}>literally: an owl</div>
            </div>
            <div style={{position: 'absolute', left: 150, top: 330, opacity: heroIn > 0.01 && f < 88 ? 1 : 0}}><Scribble w={600} p={ease(f, 60, 70)} color={INK} /></div>
          </div>
        </div>
      )}

      {/* stamp row + slots (progress = 7 stamps) */}
      {f >= S0 - 10 && (
        <div style={{position: 'absolute', inset: 0, opacity: ease(f, S0 - 10, S0 - 2)}}>
          {LIT.map((x, k) => {
            const lit = f >= x;
            const age = f - x;
            const p = stampPos(k);
            const kk = lit ? Math.min(1.1, sp(age, 0, {damping: 10, stiffness: 210, mass: 0.6})) : 0;
            const ring = lit && age >= 0 && age < 16 ? age / 16 : -1;
            return (
              <React.Fragment key={k}>
                <div style={{position: 'absolute', left: sx(k), top: SY0, opacity: 1 - ease(e, 0, 6)}}><Slot k={k} /></div>
                {lit && e < 0 && (
                  <div style={{position: 'absolute', left: p.x, top: p.y, width: SW, height: SH, transformOrigin: '0 0', transform: `scale(${p.s * (e < 0 ? 1 + (1 - kk) * 0.7 : 1)}) rotate(${p.r}deg)`, opacity: e < 0 ? Math.min(1, age / 3) : 1, zIndex: 20}}>
                    <StampArt k={k} />
                  </div>
                )}
                {ring >= 0 && e < 0 && <div style={{position: 'absolute', left: sx(k) - ring * 26, top: SY0 - ring * 26, width: SW + ring * 52, height: SH + ring * 52, border: `4px solid ${ORANGE}`, opacity: 0.6 * (1 - ring), boxSizing: 'border-box'}} />}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* captions */}
      {j >= 0 && e < 6 && (
        <div style={{position: 'absolute', left: 104, top: 398, width: 900, opacity: Math.min(1, capIn * 1.4) * capOut, transform: `translateY(${(1 - Math.min(1, capIn)) * 30}px)`}}>
          <div style={{fontFamily: SORA, fontWeight: 800, fontSize: fs, lineHeight: '88px', letterSpacing: '-0.055em', color: INK, whiteSpace: 'nowrap'}}>{ct}</div>
          <div style={{position: 'relative', display: 'inline-block', marginTop: 4}}>
            <div style={{fontFamily: SORA, fontWeight: 600, fontSize: 36, lineHeight: '46px', letterSpacing: '-0.02em', color: INK, opacity: 0.8, whiteSpace: 'nowrap'}}>{cs}</div>
            <div style={{position: 'absolute', left: 0, bottom: -2, height: 5, width: `${sub * 100}%`, background: ORANGE}} />
          </div>
        </div>
      )}

      {/* postcard photo = phone */}
      <div style={{position: 'absolute', left: VL - 24, top: VT - 24, width: VW + 48, height: VH + 48, background: CREAM, boxShadow: `0 0 0 4px ${INK}, 12px 12px 0 ${ORANGE}`, opacity: frameIn * (1 - frameOut), transform: `scale(${(0.96 + 0.04 * frameIn) * (1 - 0.05 * frameOut)})`}}>
        <div style={{position: 'absolute', left: 24, top: 24, width: VW, height: VH, overflow: 'hidden', background: INK}}>
          <Img src={staticFile('app/appbg.jpg')} style={{position: 'absolute', left: bgX, top: bgY, width: bgW, height: bgH, maxWidth: 'none'}} />
          <div style={{position: 'absolute', left: 0, top: 0, width: LW, height: LH, transformOrigin: '0 0', transform: `translate(${tx}px,${ty}px) scale(${sc})`}}>
            {j <= 0 && vPk.o > 0.01 && <div style={{position: 'absolute', inset: 0, opacity: vPk.o, transform: `scale(${vPk.sc})`}}><PickerPage t={Math.max(0, t(0))} langs={PT} /></div>}
            {vMenu.o > 0.01 && j === 1 && <div style={{position: 'absolute', inset: 0, opacity: vMenu.o, transform: `scale(${vMenu.sc})`}}><MenuPage t={Math.max(0, t(1))} pick={0} /></div>}
            {vLearn.o > 0.01 && j >= 2 && j <= 3 && (
              <div style={{position: 'absolute', inset: 0, opacity: vLearn.o, transform: `scale(${vLearn.sc})`}}>
                {j === 2 ? <LearnHero t={Math.max(0, t(2))} /> : <LearnPage title="Greetings" icon="Greetings" count="1 of 40 phrases" pct={1 / 40} chip="EVERYDAY FRENCH" l1="French" w1={HERO} l2="English" w2="Neat! / Lovely!" a1={0} a2={0} playing={0} playPress={0} t={0} />}
              </div>
            )}
            {j === 3 && <SettingsPage t={Math.max(0, t(3))} />}
            {vAuto.o > 0.01 && j === 4 && (() => {
              const lt = Math.max(0, t(4));
              const wi = Math.min(PHRASES.length - 1, Math.max(0, Math.floor((lt - WSTART) / WSTEP)));
              const wt = lt - WSTART - wi * WSTEP;
              const a1 = lt < WSTART ? 0 : audioEnv(Math.max(0, wt), 0, 5), a2 = lt < WSTART ? 0 : audioEnv(Math.max(0, wt), 5, 10);
              return <div style={{position: 'absolute', inset: 0, opacity: vAuto.o, transform: `scale(${vAuto.sc})`}}>
                <LearnPage title="Greetings" icon="Greetings" count={`${wi + 1} of 40 phrases`} pct={(wi + 1) / 40} chip="EVERYDAY FRENCH" l1="French" w1={PHRASES[wi][0]} l2="English" w2={PHRASES[wi][1]} a1={a1} a2={a2} playing={1} playPress={0} t={lt} />
              </div>;
            })()}
            {vQuiz.o > 0.01 && j === 5 && <div style={{position: 'absolute', inset: 0, opacity: vQuiz.o, transform: `scale(${vQuiz.sc})`}}><QuizPage t={Math.max(0, t(5))} q={HERO} opts={['Awful', 'Neat / Lovely', 'Excuse me', 'Good night']} ci={1} /></div>}
            {vPl.o > 0.01 && j === 6 && <div style={{position: 'absolute', inset: 0, opacity: vPl.o, transform: `scale(${vPl.sc})`}}><Playlist t={Math.max(0, t(6))} /></div>}
            {vSt.o > 0.01 && j === 7 && <div style={{position: 'absolute', inset: 0, opacity: vSt.o, transform: `scale(${vSt.sc})`}}><StatsPage t={Math.max(0, t(7))} lang="French" flag="fr" /></div>}
          </div>
        </div>
      </div>

      {/* hero tag stuck on the postcard corner */}
      <div style={{position: 'absolute', left: 800 - 190, top: 604 - 46, width: 380, height: 92, background: CREAM, boxShadow: `0 0 0 4px ${INK}, 8px 8px 0 ${INK}`, transform: 'rotate(-3deg)', opacity: tagOp, zIndex: 5}} />
      <div style={{position: 'absolute', left: 800 - 190, top: 604 - 60, width: 70, height: 26, background: ORANGE, transform: 'rotate(-10deg)', opacity: tagOp, zIndex: 6}} />
      {/* tuned chip */}
      {tuned > 0.01 && (
        <div style={{position: 'absolute', left: 150, top: 604 - 34, padding: '8px 30px 10px', background: ORANGE, boxShadow: `0 0 0 4px ${INK}, 8px 8px 0 ${INK}`, display: 'flex', alignItems: 'center', gap: 14, fontFamily: SORA, fontWeight: 800, fontSize: 42, letterSpacing: '-0.02em', color: CREAM, opacity: tuned * (1 - frameOut), transform: `rotate(2deg) scale(${0.8 + 0.2 * tuned})`, zIndex: 6}}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={CREAM} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>Tuned
        </div>
      )}
      {/* hero word */}
      {e < 6 && f >= 46 && (
        <div style={{position: 'absolute', left: hx - 450, top: hy - 90, width: 900, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${hs})`, opacity: heroOp * (1 - ease(e, -2, 4)), zIndex: 7}}>
          <HandWord text={HERO} size={140} color={ORANGE} p={heroIn} />
        </div>
      )}

      {/* ending */}
      {e >= -2 && <div style={{position: 'absolute', inset: 18, background: CREAM, opacity: ease(e, -2, 6)}} />}
      {e >= 0 && <div style={{position: 'absolute', inset: 0}}><Ending e={e} /></div>}
      {/* stamps flying into the card (above ending bg, clipped with the card) */}
      {e >= 0 && (
        <div style={{position: 'absolute', inset: 0, clipPath: `inset(0 0 ${1920 - (SLIT - 2)}px 0)`, pointerEvents: 'none'}}>
          {LIT.map((_, k) => {
            const p = stampPos(k);
            return <div key={k} style={{position: 'absolute', left: p.x, top: p.y, width: SW, height: SH, transformOrigin: '0 0', transform: `scale(${p.s}) rotate(${p.r}deg)`, zIndex: 30}}><StampArt k={k} /></div>;
          })}
        </div>
      )}
    </AbsoluteFill>
  );
};

export const ChouetteVideo: React.FC = () => {
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
    <AbsoluteFill style={{background: CREAM, fontFamily: SORA}}>
      <Main />
    </AbsoluteFill>
  );
};
