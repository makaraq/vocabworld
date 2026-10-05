import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Easing, Img, delayRender, continueRender, interpolate, spring, staticFile, useCurrentFrame} from 'remotion';
import {S, E0, TOTAL, LIT, WORDS, WSTEP, WSTART} from './gezelligTimeline';
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
export const GEZELLIG_TOTAL = TOTAL;

const VL = 107, VT = 580, VW = 865, VH = 1232, UIS = VW / 393, LW = 393, LH = 560;
const SEAM = 960;
const DUTCH: [string, string][] = (() => { const a = LANGS.slice(); const ti = a.findIndex((x) => x[0] === 'Dutch'); const tmp = a[41]; a[41] = a[ti]; a[ti] = tmp; return a; })();

/* ---------- chalk primitives ---------- */
const maskP = (p: number): React.CSSProperties => {
  if (p >= 1) return {};
  const a = p * 112 - 12, b = a + 12;
  const m = `linear-gradient(90deg, #000 ${a}%, transparent ${b}%)`;
  return {WebkitMaskImage: m, maskImage: m, opacity: p <= 0 ? 0 : 1};
};
const Chalk: React.FC<{text: string; size: number; color: string; weight?: number; p: number; ls?: string; seed?: number; lh?: number; style?: React.CSSProperties}> = ({text, size, color, weight = 700, p, ls = '-0.04em', seed = 0, lh, style}) => (
  <div style={{whiteSpace: 'nowrap', fontFamily: SORA, fontWeight: weight, fontSize: size, lineHeight: `${lh ?? Math.round(size * 1.15)}px`, letterSpacing: ls, color, ...maskP(p), ...style}}>
    {[...text].map((c, i) => (
      <span key={i} style={{display: 'inline-block', whiteSpace: 'pre', transform: `translateY(${(((i * 53 + seed * 17) % 5) - 2) * 0.9}px) rotate(${(((i * 37 + seed * 11) % 7) - 3) * 0.45}deg)`}}>{c}</span>
    ))}
  </div>
);

const CAPS: {n: string; tag: string; done: string; title: string; sub: string}[] = [
  {n: '1', tag: 'Menu', done: 'Found', title: 'Pull up the menu.', sub: 'First Aid Kit: tap Greetings.'},
  {n: '2', tag: 'Learn', done: 'Heard', title: 'Hear it out loud.', sub: 'Play: word first, then meaning.'},
  {n: '3', tag: 'Pace', done: 'Tuned', title: 'Shrink the silence.', sub: 'Pauses between words: shorter.'},
  {n: '3b', tag: 'Autoplay', done: '', title: 'Autoplay. One go.', sub: 'A whole set of everyday Dutch.'},
  {n: '4', tag: 'Quiz', done: 'Quizzed', title: "Quick, what's it mean?", sub: "One tap. Answer's instant."},
  {n: '5', tag: 'Playlist', done: 'Saved', title: 'Keep it for later.', sub: 'It lands in Café Dutch.'},
  {n: '6', tag: 'Progress', done: 'Counted', title: 'Tally it up.', sub: 'Words, streaks, badges.'},
  {n: '7', tag: 'Languages', done: 'Chosen', title: 'Fifty on the menu.', sub: "Today's special: Dutch."},
];
const LITIDX = [0, 1, 2, -1, 3, 4, 5, 6];

const Caption: React.FC<{j: number; f: number}> = ({j, f}) => {
  const c = CAPS[j];
  const st = S[j] + 2;
  const endF = j < 7 ? S[j + 1] : 99999;
  const o = 1 - ease(f, endF - 4, endF + 2);
  if (o <= 0) return null;
  const li = LITIDX[j];
  const lit = li >= 0 && f >= LIT[li];
  const k = lit ? Math.min(1.1, sp(f, LIT[li], {damping: 9, stiffness: 200, mass: 0.6})) : 1;
  const fs = Math.min(86, 940 / (c.title.length * 0.55));
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 600, opacity: o}}>
      <div style={{position: 'absolute', left: 64, top: 244, width: 952, height: 56, display: 'flex', alignItems: 'center', gap: 18, opacity: ease(f, st, st + 8)}}>
        <div style={{minWidth: 52, height: 52, padding: '0 10px', boxSizing: 'border-box', borderRadius: 26, border: `3px solid ${ORANGE}`, color: ORANGE, fontFamily: SORA, fontWeight: 800, fontSize: 28, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{c.n}</div>
        <div style={{flex: 1, height: 0, borderBottom: `4px dotted ${W(0.38)}`, marginTop: 20}} />
        {lit ? (
          <div style={{height: 52, padding: '0 20px', borderRadius: 26, border: `3px solid ${ORANGE}`, color: ORANGE, display: 'flex', alignItems: 'center', gap: 8, fontFamily: SORA, fontWeight: 700, fontSize: 28, transform: `scale(${k})`}}>
            <svg width={26} height={26} viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke={ORANGE} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" /></svg>{c.done}
          </div>
        ) : (
          <div style={{fontFamily: SORA, fontWeight: 600, fontSize: 28, color: W(0.7), letterSpacing: 1}}>{c.tag}</div>
        )}
      </div>
      <div style={{position: 'absolute', left: 64, top: 306}}><Chalk text={c.title} size={fs} color={CREAM} p={io(f, st + 3, st + 17)} seed={j} lh={104} /></div>
      <div style={{position: 'absolute', left: 64, top: 414}}><Chalk text={c.sub} size={38} weight={500} ls="-0.02em" color={ORANGE} p={io(f, st + 13, st + 25)} seed={j + 3} lh={50} /></div>
    </div>
  );
};

/* ---------- tally: 7 marks ---------- */
const MARKS: {x1: number; y1: number; x2: number; y2: number; o?: boolean}[] = [
  {x1: 12, y1: 8, x2: 10, y2: 66}, {x1: 38, y1: 6, x2: 40, y2: 66}, {x1: 64, y1: 8, x2: 62, y2: 67}, {x1: 90, y1: 6, x2: 92, y2: 66},
  {x1: -6, y1: 58, x2: 108, y2: 14, o: true},
  {x1: 140, y1: 8, x2: 138, y2: 66}, {x1: 168, y1: 6, x2: 170, y2: 66},
];
const Tally: React.FC<{f: number}> = ({f}) => (
  <svg width={210} height={76} viewBox="0 0 210 76" style={{position: 'absolute', left: 806, top: 440, overflow: 'visible', opacity: ease(f, S[0] - 6, S[0] + 4)}}>
    {MARKS.map((m, i) => {
      const L = Math.hypot(m.x2 - m.x1, m.y2 - m.y1) + 2;
      const d = ease(f, LIT[i], LIT[i] + 8);
      return (
        <g key={i}>
          <line x1={m.x1} y1={m.y1} x2={m.x2} y2={m.y2} stroke={CREAM} strokeOpacity={0.17} strokeWidth={6} strokeLinecap="round" />
          <line x1={m.x1} y1={m.y1} x2={m.x2} y2={m.y2} stroke={m.o ? ORANGE : CREAM} strokeWidth={m.o ? 8 : 7} strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L * (1 - d)} style={{display: d <= 0.01 ? 'none' : 'inline'}} />
        </g>
      );
    })}
  </svg>
);
// the 5th mark (slash) must draw after the 4th and the 6th after: LIT order is feature order, marks 0..6 map directly.

/* ---------- hook ---------- */
const Hook: React.FC<{f: number}> = ({f}) => {
  const o1 = 1 - ease(f, 46, 54);
  const out = 1 - ease(f, S[0] - 4, S[0] + 2);
  if (f > S[0] + 3) return null;
  return (
    <>
      <div style={{position: 'absolute', left: 60, top: 262, opacity: o1}}>
        <Chalk text="Some feelings have" size={92} color={CREAM} p={io(f, 2, 16)} lh={120} />
        <Chalk text="no English word." size={92} color={ORANGE} p={io(f, 14, 30)} lh={120} seed={4} />
      </div>
      <div style={{position: 'absolute', left: 60, top: 250, opacity: out}}>
        <Chalk text="Gezellig" size={176} weight={800} ls="-0.05em" color={ORANGE} p={io(f, 50, 64)} lh={200} seed={2} />
        <Chalk text="cosy + warm + together, all at once" size={38} weight={500} ls="-0.02em" color={CREAM} p={io(f, 62, 76)} lh={50} seed={6} style={{marginTop: 8}} />
      </div>
    </>
  );
};

/* ---------- phone pages ---------- */
const LearnPhrase: React.FC<{t: number}> = ({t}) => {
  const f = useFinger(t, [300, 500], [196, 436], 8, 20, 22, 70);
  const playing = t >= 23 ? 1 : 0;
  const a1 = audioEnv(t, 26, 54), a2 = audioEnv(t, 56, 84);
  return (
    <LearnPage title="Greetings" icon="Greetings" count="1 of 40 words" pct={1 / 40} chip="EVERYDAY DUTCH" l1="Dutch" w1="gezellig" l2="English" w2="cosy, together" a1={a1} a2={a2} playing={playing} playPress={f.press} t={t}
      pressFinger={<><Finger x={f.x} y={f.y} show={f.show} press={f.press} /><div style={{position: 'absolute', left: 196, top: 436}}>{f.rp}</div></>} />
  );
};
const rowY = (i: number) => 258 + i * 60;
const CafePlaylist: React.FC<{t: number}> = ({t}) => {
  const lists: [string, number][] = [['Hard ones', 33], ['Café Dutch', 8], ['Daily', 21]];
  const fly = io(t, 10, 28);
  const land = t >= 28 ? ease(t, 28, 36) : 0;
  const bump = t >= 28 && t < 38 ? 1 + 0.08 * Math.sin(((t - 28) / 10) * Math.PI) : 1;
  const f = useFinger(t, [330, 470], [196, rowY(1) + 26], 40, 52, 54, 16);
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
        const h = i === 1 ? Math.max(land, t >= 54 ? 1 : 0) : 0;
        const cnt = i === 1 && t >= 28 ? c + 1 : c;
        return (
          <div key={n} style={{position: 'absolute', left: 40, top: rowY(i) + (1 - st) * 20, width: 313, height: 52, borderRadius: 12, background: W(0.06 + 0.16 * h), border: i === 1 && h > 0 ? `1px solid ${W(0.35 * h)}` : '1px solid transparent', boxSizing: 'border-box', opacity: Math.min(1, st * 1.5), transform: `scale(${i === 1 ? bump : 1})`}}>
            <Txt x={16} y={8} size={16} weight={500}>{n}</Txt>
            <Txt x={16} y={29} size={12} color={i === 1 && t >= 28 ? CREAM : W(0.5)}>{cnt} words</Txt>
            <div style={{position: 'absolute', right: 14, top: 14}}><ChevR size={22} color={W(0.5)} /></div>
          </div>
        );
      })}
      {t >= 10 && t < 34 && (
        <div style={{position: 'absolute', left: 196 - 70, top: cy - 20, width: 140, height: 40, borderRadius: 20, background: W(0.28), border: `1.5px solid ${CREAM}`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: UI, fontWeight: 600, fontSize: 17, color: '#fff', backdropFilter: 'blur(8px)', transform: `scale(${1 - 0.15 * fly})`, opacity: 1 - ease(t, 28, 34)}}>gezellig</div>
      )}
      <Dots cur={7} />
      <Finger x={f.x} y={f.y} show={f.show} press={f.press} /><div style={{position: 'absolute', left: 196, top: rowY(1) + 26}}>{f.rp}</div>
    </>
  );
};

/* ---------- ending: the board wipes clean ---------- */
const Ending: React.FC<{e: number}> = ({e}) => {
  const ic = sp(e, 66, {damping: 11, stiffness: 150, mass: 0.8});
  const bd = sp(e, 96, {damping: 12, stiffness: 120, mass: 0.7});
  const ft = ease(e, 110, 124);
  const ul = io(e, 62, 76);
  return (
    <>
      <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: SEAM, filter: 'url(#chalk)'}}>
        <div style={{position: 'absolute', left: 0, top: 300, width: 1080, display: 'flex', justifyContent: 'center'}}><Chalk text="Get Sprind." size={168} weight={800} ls="-0.055em" color={CREAM} p={io(e, 30, 48)} lh={190} seed={1} /></div>
        <div style={{position: 'absolute', left: 0, top: 500, width: 1080, display: 'flex', justifyContent: 'center'}}><Chalk text="Start now." size={104} weight={700} ls="-0.04em" color={ORANGE} p={io(e, 52, 64)} lh={120} seed={5} /></div>
        <svg width={520} height={30} viewBox="0 0 520 30" style={{position: 'absolute', left: 280, top: 640, ...maskP(ul)}}>
          <path d="M6 18 C60 4 110 28 170 14 S290 4 340 18 S450 26 514 10" fill="none" stroke={ORANGE} strokeWidth={7} strokeLinecap="round" />
        </svg>
      </div>
      <Img src={staticFile('app-icon.png')} style={{position: 'absolute', left: 540 - 105, top: SEAM - 232, width: 210, height: 210, borderRadius: 48, transform: `scale(${ic}) rotate(${(1 - Math.min(1, ic)) * -8}deg)`, opacity: Math.min(1, ic * 1.6), boxShadow: `0 0 0 6px ${INK}`}} />
      <Img src={staticFile('app-store-badge.png')} style={{position: 'absolute', left: 540 - 240, top: 1150, height: 142, transform: `scale(${bd}) translateY(${(1 - bd) * 50}px)`, opacity: Math.min(1, bd)}} />
      <div style={{position: 'absolute', left: 0, top: 1390, width: 1080, textAlign: 'center', fontFamily: SORA, opacity: ft, transform: `translateY(${(1 - ft) * 24}px)`}}>
        <div style={{fontWeight: 800, fontSize: 72, letterSpacing: -3, color: INK, lineHeight: '84px'}}>Gezellig</div>
        <div style={{fontWeight: 500, fontSize: 36, letterSpacing: -0.5, color: ORANGE, marginTop: 6}}>cosy, warm, together.</div>
      </div>
    </>
  );
};

const Main: React.FC = () => {
  const f = useCurrentFrame();
  const e = f - E0;
  const j = S.reduce((a, s, i) => (f >= s ? i : a), -1);
  const t = (jj: number) => f - S[jj];
  const pageVis = (start: number, end: number) => {
    const inn = interpolate(f, [start, start + 7], [0, 1], clamp);
    const out = interpolate(f, [end - 1, end + 6], [1, 0], clamp);
    const o = Math.min(inn, out);
    return {o, sc: 0.95 + 0.05 * o};
  };
  const vMenu = pageVis(-10, S[1]);
  const vLearn = pageVis(S[1], S[3]);
  const vAuto = pageVis(S[3], S[4]);
  const vQuiz = pageVis(S[4], S[5]);
  const vPl = pageVis(S[5], S[6]);
  const vSt = pageVis(S[6], S[7]);
  const vPk = pageVis(S[7], E0 + 6);
  const zoom = j === 1 ? ease(t(1), 4, 46) * (1 - ease(t(1), 90, 102)) : 0;
  const enter = sp(f, 0, {damping: 16, stiffness: 110, mass: 0.9});
  const zm = 1.22, fx = 196, fy = 300;
  const sc = UIS * (1 + (zm - 1) * zoom);
  const tx = lerp(fx * UIS, VW / 2, zoom) - fx * sc, ty = lerp(fy * UIS, VH / 2 - 40, zoom) - fy * sc;
  const bgH = 1800, bgW = bgH * (4266 / 2400);
  const bgX = -(bgW - VW) * (0.72 + 0.22 * (f / TOTAL));
  const bgY = -(bgH - VH) * 0.55;
  const vpOut = ease(e, -2, 10);
  // eraser
  const ex = lerp(-260, 1190, io(e, 4, 26));
  const wiping = e >= 0 && e < 34;
  const bm = e >= 4 ? `linear-gradient(90deg, transparent ${ex + 110}px, #000 ${ex + 134}px)` : undefined;

  return (
    <AbsoluteFill style={{background: INK}}>
      <svg width={0} height={0} style={{position: 'absolute'}}>
        <defs>
          <filter id="chalk" x="-2%" y="-2%" width="104%" height="104%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  3.2 0 0 0 -0.6" result="a" />
            <feComposite in="SourceGraphic" in2="a" operator="in" result="g" />
            <feTurbulence type="turbulence" baseFrequency="0.035" numOctaves="2" seed="9" result="w" />
            <feDisplacementMap in="g" in2="w" scale="3.5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
      {/* table: cream lower half, orange ledge at the seam */}
      <div style={{position: 'absolute', left: 0, top: SEAM, width: 1080, height: 1920 - SEAM, background: CREAM}} />
      <div style={{position: 'absolute', left: 0, top: SEAM - 4, width: 1080, height: 16, background: ORANGE}} />
      {/* chalk frame */}
      <svg width={1080} height={SEAM} style={{position: 'absolute', left: 0, top: 0, filter: 'url(#chalk)', opacity: 0.5}}>
        <rect x={30} y={30} width={1020} height={SEAM - 20} rx={30} fill="none" stroke={CREAM} strokeWidth={4} />
      </svg>

      {/* the board: chalk lines */}
      <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 700, filter: 'url(#chalk)', WebkitMaskImage: bm, maskImage: bm}}>
        <Hook f={f} />
        {j >= 0 && CAPS.map((_, i) => (f >= S[i] - 1 && f < (i < 7 ? S[i + 1] + 8 : 99999) ? <Caption key={i} j={i} f={f} /> : null))}
        <Tally f={f} />
      </div>
      {wiping && (
        <>
          <div style={{position: 'absolute', left: 0, top: 236, width: Math.max(0, ex + 120), height: 330, background: 'rgba(255,243,230,0.035)', opacity: 1 - ease(e, 24, 34), filter: 'blur(10px)'}} />
          <div style={{position: 'absolute', left: ex, top: 236, width: 230, height: 330, borderRadius: 30, background: ORANGE, transform: `rotate(${-3 + 4 * Math.sin(e / 3)}deg)`, boxShadow: `0 0 0 6px ${INK}`}}>
            <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 64, borderRadius: '0 0 30px 30px', background: CREAM}} />
            <div style={{position: 'absolute', left: 30, right: 30, top: 40, height: 10, borderRadius: 5, background: INK, opacity: 0.25}} />
          </div>
        </>
      )}

      {/* the phone */}
      <div style={{position: 'absolute', left: VL, top: VT, width: VW, height: VH, borderRadius: 52, overflow: 'hidden', background: INK, boxShadow: `0 0 0 8px ${INK}`, opacity: Math.min(1, enter * 2) * (1 - vpOut), transform: `scale(${(0.94 + 0.06 * Math.min(1, enter)) * (1 - 0.06 * vpOut)})`}}>
        <Img src={staticFile('app/appbg.jpg')} style={{position: 'absolute', left: bgX, top: bgY, width: bgW, height: bgH, maxWidth: 'none'}} />
        <div style={{position: 'absolute', left: 0, top: 0, width: LW, height: LH, transformOrigin: '0 0', transform: `translate(${tx}px,${ty}px) scale(${sc})`}}>
          {j <= 1 && vMenu.o > 0.01 && f < S[1] + 8 && <div style={{position: 'absolute', inset: 0, opacity: vMenu.o, transform: `scale(${vMenu.sc})`}}><MenuPage t={f < S[0] ? Math.min(f, 24) : 24 + (f - S[0])} pick={0} fo={18} /></div>}
          {vLearn.o > 0.01 && j >= 1 && j <= 2 && (
            <div style={{position: 'absolute', inset: 0, opacity: vLearn.o, transform: `scale(${vLearn.sc})`}}>
              {j === 1 ? <LearnPhrase t={Math.max(0, t(1))} /> : <LearnPage title="Greetings" icon="Greetings" count="1 of 40 words" pct={1 / 40} chip="EVERYDAY DUTCH" l1="Dutch" w1="gezellig" l2="English" w2="cosy, together" a1={0} a2={0} playing={0} playPress={0} t={0} />}
            </div>
          )}
          {j === 2 && <SettingsPage t={Math.max(0, t(2))} />}
          {vAuto.o > 0.01 && j === 3 && (() => {
            const lt = Math.max(0, t(3));
            const wi = Math.min(WORDS.length - 1, Math.max(0, Math.floor((lt - WSTART) / WSTEP)));
            const wt = lt - WSTART - wi * WSTEP;
            const a1 = lt < WSTART ? 0 : audioEnv(Math.max(0, wt), 0, 5), a2 = lt < WSTART ? 0 : audioEnv(Math.max(0, wt), 5, 10);
            return <div style={{position: 'absolute', inset: 0, opacity: vAuto.o, transform: `scale(${vAuto.sc})`}}>
              <LearnPage title="Greetings" icon="Greetings" count={`${wi + 1} of 40 words`} pct={(wi + 1) / 40} chip="EVERYDAY DUTCH" l1="Dutch" w1={WORDS[wi][0]} l2="English" w2={WORDS[wi][1]} a1={a1} a2={a2} playing={1} playPress={0} t={lt} />
            </div>;
          })()}
          {vQuiz.o > 0.01 && j === 4 && <div style={{position: 'absolute', inset: 0, opacity: vQuiz.o, transform: `scale(${vQuiz.sc})`}}><QuizPage t={Math.max(0, t(4))} q="gezellig" opts={['tidy', 'cosy, together', 'far away', 'expensive']} ci={1} /></div>}
          {vPl.o > 0.01 && j === 5 && <div style={{position: 'absolute', inset: 0, opacity: vPl.o, transform: `scale(${vPl.sc})`}}><CafePlaylist t={Math.max(0, t(5))} /></div>}
          {vSt.o > 0.01 && j === 6 && <div style={{position: 'absolute', inset: 0, opacity: vSt.o, transform: `scale(${vSt.sc})`}}><StatsPage t={Math.max(0, t(6))} lang="Dutch" flag="nl" /></div>}
          {vPk.o > 0.01 && j === 7 && <div style={{position: 'absolute', inset: 0, opacity: vPk.o}}><PickerPage t={Math.max(0, t(7))} langs={DUTCH} /></div>}
        </div>
      </div>

      {e >= 0 && <Ending e={e} />}
    </AbsoluteFill>
  );
};

export const GezelligVideo: React.FC = () => {
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
