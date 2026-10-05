import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Easing, Img, delayRender, continueRender, interpolate, spring, staticFile, useCurrentFrame} from 'remotion';
import {S, E0, TOTAL, LIT, PACE, LABELS, PHRASES, WSTEP, WSTART} from './yallaTimeline';
import {LANGS, audioEnv, GlassBox, Txt, Finger, useFinger, ChevR, Panel, Dots, Body, Topic, LearnPage, SettingsPage, QuizPage, StatsPage, PickerPage, Circle} from './Glass';
import {GI} from './glassIcons';

const ORANGE = '#FF5B1A', INK = '#0D0B0A', CREAM = '#FFF3E6', GREEN = '#22C55E';
const SORA = "'SoraV', sans-serif";
const UI = "'SpaceG', 'SoraV', sans-serif";
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const sp = (f: number, delay: number, cfg = {damping: 12, stiffness: 130, mass: 0.7}) => spring({frame: f - delay, fps: 30, config: cfg});
const E = Easing.bezier(0.16, 1, 0.3, 1);
const ease = (f: number, a: number, b: number) => E(interpolate(f, [a, b], [0, 1], clamp));
const io = (f: number, a: number, b: number) => Easing.inOut(Easing.cubic)(interpolate(f, [a, b], [0, 1], clamp));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const W = (a: number) => `rgba(255,255,255,${a})`;
export const YALLA_TOTAL = TOTAL;

/* ---------- layout ---------- */
const VL = 147, VT = 690, VW = 786, VH = 1120, UIS = VW / 393, LW = 393, LH = 560;
const PA: [string, string][] = (() => { const a = LANGS.slice(); const ti = a.findIndex((x) => x[0] === 'Arabic'); const tmp = a[41]; a[41] = a[ti]; a[ti] = tmp; return a; })();
const MEANINGS = ["let's go", 'hurry up', 'come on', 'go ahead'];
const CAPS: [string, string][] = [
  ['First Aid Kit.', 'Tap Modern Expressions.'],
  ['Press play.', 'Hear it. Say it loud.'],
  ['Shrink the pauses.', 'Slide the gap from long to short.'],
  ['Autoplay.', 'A sorted set, all in one go.'],
  ['Did it stick?', 'One tap. Instant answer.'],
  ['Save it.', 'Yalla lands in Road trip.'],
  ['Watch it climb.', 'Words, streaks, badges.'],
  ['Fifty lanes.', 'Pick yours. Arabic today.'],
];

/* ---------- needle = pace of the whole video ---------- */
const spr = (t: number, z = 0.42, wn = 14) => {
  if (t <= 0) return 0;
  const s = t / 30, wd = wn * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * wn * s) * (Math.cos(wd * s) + ((z * wn) / wd) * Math.sin(wd * s));
};
const seg = (f: number, j: number) => (j === 2 ? io(f, S[2] + 64, S[2] + 90) : spr(f - LIT[j]));
const pNeedle = (f: number) => {
  let p = 0;
  PACE.forEach((v, j) => { p += (v - (j ? PACE[j - 1] : 0)) * seg(f, j); });
  p += (1.0 - PACE[7]) * spr(f - (E0 + 10), 0.3, 13);
  return Math.min(1.08, p);
};
const CUM: number[] = (() => {
  const a: number[] = [0];
  for (let i = 1; i <= TOTAL + 2; i++) {
    const boost = i >= 62 ? 26 * Math.exp(-(i - 62) / 22) : 0;
    const peg = i >= E0 + 10 ? 20 * Math.min(1, (i - E0 - 10) / 20) : 0;
    a.push(a[i - 1] + 2.4 + 30 * Math.min(1, pNeedle(i)) + boost + peg);
  }
  return a;
})();
const cum = (f: number) => CUM[Math.max(0, Math.min(CUM.length - 1, Math.round(f)))];

/* ---------- race track backdrop: ink + orange lane lines ---------- */
const stad = (x: number, y: number, w: number, h: number) => { const r = w / 2; return `M${x} ${y + r} A${r} ${r} 0 0 1 ${x + w} ${y + r} V${y + h - r} A${r} ${r} 0 0 1 ${x} ${y + h - r} Z`; };
const per = (w: number, h: number) => 2 * (h - w) + Math.PI * w;
const Track: React.FC<{f: number}> = ({f}) => {
  const lanes = [0, 70, 140].map((i) => ({x: 30 + i, y: 70 + i, w: 1020 - 2 * i, h: 1780 - 2 * i}));
  const mids = [35, 105].map((i) => ({x: 30 + i, y: 70 + i, w: 1020 - 2 * i, h: 1780 - 2 * i}));
  const o = cum(f);
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, WebkitMaskImage: 'linear-gradient(to bottom, #000 0, #000 190px, rgba(0,0,0,0.3) 250px, rgba(0,0,0,0.3) 650px, #000 740px)', maskImage: 'linear-gradient(to bottom, #000 0, #000 190px, rgba(0,0,0,0.3) 250px, rgba(0,0,0,0.3) 650px, #000 740px)'}}>
      {lanes.map((l, i) => <path key={i} d={stad(l.x, l.y, l.w, l.h)} fill="none" stroke={ORANGE} strokeWidth={3} opacity={0.3} />)}
      {mids.map((l, i) => <path key={i} d={stad(l.x, l.y, l.w, l.h)} fill="none" stroke={ORANGE} strokeWidth={3} opacity={0.34} strokeDasharray="26 30" strokeDashoffset={-o * (i ? -0.6 : 0.6)} />)}
      {lanes.slice(0, 2).map((l, i) => {
        const P = per(l.w, l.h);
        const off = -((o * (i ? 1.25 : 1)) % P);
        return (
          <g key={i}>
            <path d={stad(l.x, l.y, l.w, l.h)} fill="none" stroke={ORANGE} strokeWidth={9} strokeLinecap="round" opacity={0.35} strokeDasharray={`240 ${P}`} strokeDashoffset={off + 0} />
            <path d={stad(l.x, l.y, l.w, l.h)} fill="none" stroke={ORANGE} strokeWidth={9} strokeLinecap="round" strokeDasharray={`60 ${P}`} strokeDashoffset={off} />
          </g>
        );
      })}
    </svg>
  );
};

/* ---------- dial ---------- */
const ang = (p: number) => ((225 - 270 * p) * Math.PI) / 180;
const pt = (p: number, r: number): [number, number] => [200 + r * Math.cos(ang(p)), 200 - r * Math.sin(ang(p))];
const arc = (p0: number, p1: number, r: number) => { const [x0, y0] = pt(p0, r), [x1, y1] = pt(p1, r); return `M${x0} ${y0} A${r} ${r} 0 ${(p1 - p0) * 270 > 180 ? 1 : 0} 1 ${x1} ${y1}`; };
const Dial: React.FC<{f: number; label: string; labelAge: number; go: number}> = ({f, label, labelAge, go}) => {
  const p = pNeedle(f) + (f > 80 ? 0.004 * Math.sin(f * 1.9) : 0);
  const deg = 225 - 270 * p;
  const pc = Math.min(1, p);
  const lo = ease(labelAge, 0, 6), pop = 1 + 0.12 * Math.sin(Math.min(1, labelAge / 8) * Math.PI);
  return (
    <svg width={400} height={400} viewBox="0 0 400 400" style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
      <circle cx={200} cy={200} r={170} fill={INK} stroke={W(0.16)} strokeWidth={2} />
      <path d={arc(0, 1, 150)} fill="none" stroke={CREAM} strokeOpacity={0.18} strokeWidth={9} strokeLinecap="round" />
      {pc > 0.003 && <path d={arc(0, pc, 150)} fill="none" stroke={go > 0.5 ? GREEN : ORANGE} strokeWidth={9} strokeLinecap="round" />}
      {Array.from({length: 41}, (_, i) => { const q = i / 40; const [x0, y0] = pt(q, i % 4 === 0 ? 124 : 132), [x1, y1] = pt(q, 140); return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke={CREAM} strokeOpacity={i % 4 === 0 ? 0.55 : 0.3} strokeWidth={i % 4 === 0 ? 3 : 2} />; })}
      {PACE.map((v, k) => { const [x, y] = pt(v, 150); const on = pc >= v - 0.002; return <circle key={k} cx={x} cy={y} r={9} fill={on ? (go > 0.5 ? GREEN : ORANGE) : INK} stroke={on ? (go > 0.5 ? GREEN : ORANGE) : CREAM} strokeOpacity={on ? 1 : 0.6} strokeWidth={3} />; })}
      {(() => { const [x0, y0] = pt(1, 120), [x1, y1] = pt(1, 142); return <line x1={x0} y1={y0} x2={x1} y2={y1} stroke={go > 0.5 ? GREEN : ORANGE} strokeWidth={5} strokeLinecap="round" />; })()}
      <g transform={`rotate(${-deg} 200 200)`}>
        <line x1={178} y1={200} x2={328} y2={200} stroke={CREAM} strokeWidth={7} strokeLinecap="round" />
        <line x1={296} y1={200} x2={330} y2={200} stroke={go > 0.5 ? GREEN : ORANGE} strokeWidth={7} strokeLinecap="round" />
      </g>
      <g opacity={lo} transform={`translate(200 ${290 + (1 - lo) * 8}) scale(${pop})`}>
        <rect x={-70} y={-19} width={140} height={38} rx={19} fill={go > 0.5 ? GREEN : CREAM} />
        <text x={0} y={7} textAnchor="middle" fontFamily={SORA} fontWeight={800} fontSize={20} fill={INK}>{label}</text>
      </g>
    </svg>
  );
};

/* ---------- phone pages ---------- */
const MENU_TILES = ['Greetings', 'Travel', 'Emotions', 'Modern Expressions', 'Food', 'Time'];
const tXY = (i: number) => ({x: i % 2 ? 203 : 28, y: 72 + Math.floor(i / 2) * 132});
const MenuHero: React.FC<{t: number; ft: number}> = ({t, ft}) => {
  const pick = 3;
  const f = useFinger(ft, [330, 470], [tXY(pick).x + 81, tXY(pick).y + 62], 4, 22, 25, 14);
  const sel = ft >= 25 ? ease(ft, 25, 31) : 0;
  return (
    <>
      <Panel>
        <div style={{position: 'absolute', left: 0, right: 0, top: 18, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, fontFamily: UI, fontWeight: 600, fontSize: 17, letterSpacing: '0.08em', color: '#fff'}}>
          <Body body={GI['s:medical-kit-bold']} size={22} color="#fff" />FIRST AID KIT
        </div>
        {MENU_TILES.map((n, i) => {
          const p = tXY(i);
          const stagger = sp(t, 2 + i * 2, {damping: 14, stiffness: 150, mass: 0.7});
          const press = i === pick ? sel : 0;
          return (
            <div key={n} style={{position: 'absolute', left: p.x - 14, top: p.y - 8, width: 162, height: 124, borderRadius: 16, background: `rgba(0,0,0,${0.4 + 0.18 * press})`, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', transform: `scale(${(0.9 + 0.1 * Math.min(1, stagger)) * (1 - 0.04 * press)})`, opacity: Math.min(1, stagger * 1.5)}}>
              <div style={{position: 'absolute', left: 0, right: 0, top: 22, display: 'flex', justifyContent: 'center'}}><Topic name={n} size={46} /></div>
              <Txt x={0} y={84} w={162} size={n.length > 14 ? 15 : 16} weight={500} color={W(0.9)} align="center">{n}</Txt>
            </div>
          );
        })}
      </Panel>
      <Dots cur={1} />
      <Finger x={f.x} y={f.y} show={f.show} press={f.press} />
      <div style={{position: 'absolute', left: tXY(pick).x + 81, top: tXY(pick).y + 62}}>{f.rp}</div>
    </>
  );
};
const LEARN = {title: (<span style={{fontSize: 17, whiteSpace: 'nowrap'}}>Modern Expressions</span>) as any, icon: 'Modern Expressions', count: '1 of 40 phrases', pct: 1 / 40, chip: 'EVERYDAY ARABIC', l1: 'Arabic', w1: 'Yalla', l2: 'English', w2: "Let's go! / Hurry up!"};
const LearnHero: React.FC<{t: number}> = ({t}) => {
  const f = useFinger(t, [300, 500], [196, 436], 6, 18, 20, 90);
  const playing = t >= 21 && t < 100 ? 1 : 0;
  return (
    <LearnPage {...LEARN} a1={audioEnv(t, 24, 58)} a2={audioEnv(t, 60, 94)} playing={playing} playPress={f.press} t={t}
      pressFinger={<><Finger x={f.x} y={f.y} show={f.show} press={f.press} /><div style={{position: 'absolute', left: 196, top: 436}}>{f.rp}</div></>} />
  );
};
const rowY = (i: number) => 258 + i * 60;
const Playlist: React.FC<{t: number}> = ({t}) => {
  const lists: [string, number][] = [['Road trip', 14], ['Dinner table', 9], ['Market talk', 17]];
  const fly = io(t, 8, 26);
  const land = t >= 26 ? ease(t, 26, 34) : 0;
  const bump = t >= 26 && t < 36 ? 1 + 0.08 * Math.sin(((t - 26) / 10) * Math.PI) : 1;
  const f = useFinger(t, [330, 470], [196, rowY(0) + 26], 34, 44, 46, 14);
  const cy = lerp(60, rowY(0) + 26, fly);
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
        const st = sp(t, 2 + i * 3, {damping: 14, stiffness: 150, mass: 0.7});
        const h = i === 0 ? Math.max(land, t >= 44 ? 1 : 0) : 0;
        const cnt = i === 0 && t >= 26 ? c + 1 : c;
        return (
          <div key={n} style={{position: 'absolute', left: 40, top: rowY(i) + (1 - st) * 20, width: 313, height: 52, borderRadius: 12, background: W(0.06 + 0.16 * h), border: i === 0 && h > 0 ? `1px solid ${W(0.35 * h)}` : '1px solid transparent', boxSizing: 'border-box', opacity: Math.min(1, st * 1.5), transform: `scale(${i === 0 ? bump : 1})`}}>
            <Txt x={16} y={8} size={16} weight={500}>{n}</Txt>
            <Txt x={16} y={29} size={12} color={i === 0 && t >= 26 ? CREAM : W(0.5)}>{cnt} phrases</Txt>
            <div style={{position: 'absolute', right: 14, top: 14}}><ChevR size={22} color={W(0.5)} /></div>
          </div>
        );
      })}
      {t >= 8 && t < 32 && (
        <div style={{position: 'absolute', left: 196 - 70, top: cy - 20, width: 140, height: 40, borderRadius: 20, background: W(0.28), border: `1.5px solid ${CREAM}`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: UI, fontWeight: 600, fontSize: 17, color: '#fff', backdropFilter: 'blur(8px)', transform: `scale(${1 - 0.15 * fly})`, opacity: 1 - ease(t, 26, 32)}}>Yalla</div>
      )}
      <Dots cur={7} />
      <Finger x={f.x} y={f.y} show={f.show} press={f.press} /><div style={{position: 'absolute', left: 196, top: rowY(0) + 26}}>{f.rp}</div>
    </>
  );
};

/* ---------- hook: slow and steady -> not today ---------- */
const Hook: React.FC<{f: number}> = ({f}) => {
  const out = 1 - ease(f, 86, 96);
  const slowOut = 1 - ease(f, 56, 62);
  const w = (d: number) => ease(f, d, d + 10);
  const crawl = f < 58 ? (f / 58) * 90 : 90 + ease(f, 58, 70) * 840;
  const slamK = sp(f, 62, {damping: 9, stiffness: 170, mass: 0.8});
  const ls = lerp(-3, 12, Math.min(1, f / 58));
  const fill = f < 58 ? crawl : 90 + ease(f, 58, 70) * 840;
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, opacity: out}}>
      <div style={{position: 'absolute', left: 60, top: 262, fontFamily: SORA, opacity: slowOut}}>
        <div style={{fontWeight: 700, fontSize: 70, letterSpacing: '-0.03em', color: CREAM, opacity: 0.85 * w(-2)}}>Everyone says</div>
        <div style={{display: 'flex', flexDirection: 'column', marginTop: 4}}>
          {[['slow and', 8], ['steady.', 24]].map(([t, d]: any, i) => (
            <div key={i} style={{fontWeight: 800, fontSize: 134, lineHeight: '136px', letterSpacing: ls, color: CREAM, opacity: w(d), transform: `translateY(${(1 - w(d)) * 20}px)`, whiteSpace: 'nowrap'}}>{t}</div>
          ))}
        </div>
      </div>
      <div style={{position: 'absolute', left: 60, top: 300, fontFamily: SORA, fontWeight: 800, fontSize: 154, letterSpacing: '-0.05em', lineHeight: '150px', color: ORANGE, whiteSpace: 'nowrap', opacity: f >= 62 ? Math.min(1, slamK * 3) : 0, transformOrigin: '0 60%', transform: `scale(${1 + (1 - Math.min(1.1, slamK)) * 0.5}) skewX(-8deg)`}}>
        Not<br />today.
      </div>
      <div style={{position: 'absolute', left: 60, top: 648, width: 960, height: 8, borderRadius: 4, background: W(0.14)}} />
      <div style={{position: 'absolute', left: 60, top: 648, width: Math.max(8, fill), height: 8, borderRadius: 4, background: ORANGE, opacity: f < 58 ? 0.55 : 1}} />
      <div style={{position: 'absolute', left: 60 + fill - 14, top: 639, width: 26, height: 26, borderRadius: 13, background: ORANGE, boxShadow: f >= 58 ? `0 0 0 ${ease(f, 58, 72) * 14}px rgba(255,91,26,${0.3 * (1 - ease(f, 58, 76))})` : 'none'}} />
    </div>
  );
};

/* ---------- main ---------- */
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
  const vMenu = pv(-10, S[1]);
  const vLearn = pv(S[1], S[3]);
  const vAuto = pv(S[3], S[4]);
  const vQuiz = pv(S[4], S[5]);
  const vPl = pv(S[5], S[6]);
  const vSt = pv(S[6], S[7]);
  const vPk = pv(S[7], E0 + 6);
  const enter = sp(f, 0, {damping: 16, stiffness: 110, mass: 0.9});
  const bgH = 1500, bgW = bgH * (4266 / 2400);
  const bgX = -(bgW - VW) * (0.72 + 0.22 * (f / TOTAL));
  const bgY = -(bgH - VH) * 0.55;
  const m = io(e, 0, 28);
  const fadeTop = 1 - ease(e, -2, 10);
  const fadePhone = 1 - ease(e, -2, 14);
  const cap = Math.max(0, j);
  const [ct, cs] = CAPS[cap];
  const fs = Math.min(76, 620 / (ct.length * 0.56));
  const capIn = j >= 0 ? sp(f, S[j], {damping: 14, stiffness: 150, mass: 0.7}) : 0;
  const litN = LIT.filter((x) => f >= x).length;
  const lastLit = litN - 1;
  let label = lastLit >= 0 ? LABELS[lastLit] : 'Ready';
  let labelAge = lastLit >= 0 ? f - LIT[lastLit] : f - 80;
  if (e >= 30) { label = e >= 40 ? 'Go' : 'Top speed'; labelAge = e >= 40 ? e - 40 : e - 30; }
  const goK = e >= 40 ? 1 : 0;
  const dialIn = ease(f, 78, 94);
  const dcx = lerp(850, 540, m), dcy = lerp(470, 630, m), ds = lerp(1, 1.9, m);
  // hub: pivot cap -> green lamp -> app icon
  const lampK = ease(e, 38, 46);
  const lampPulse = e >= 40 ? ease(e, 40, 60) : 0;
  const iconK = ease(e, 60, 78);
  const hubD = lerp(lerp(34, 68, m), lerp(68, 124, lampK), 1) * (1 - iconK) + 230 * iconK;
  const hubR = lerp(50, 22, iconK);
  const hubBg = lampK > 0 ? GREEN : CREAM;
  const meaning = MEANINGS[cap % 4];
  const plateIn = ease(f, S[0] - 2, S[0] + 8);
  const gs = sp(e, 64, {damping: 11, stiffness: 140, mass: 0.8});
  const st = ease(e, 82, 96);
  const bd = sp(e, 104, {damping: 12, stiffness: 120, mass: 0.7});

  return (
    <AbsoluteFill style={{background: INK}}>
      <Track f={f} />
      <Hook f={f} />

      {j >= 0 && (
        <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 700, opacity: fadeTop}}>
          <div style={{position: 'absolute', left: 60, top: 262, display: 'flex', alignItems: 'center', gap: 22, fontFamily: SORA, opacity: plateIn}}>
            <div style={{display: 'flex', alignItems: 'stretch', borderRadius: 14, overflow: 'hidden', background: CREAM, boxShadow: `0 0 0 4px ${INK}, 0 0 0 7px ${CREAM}`}}>
              <div style={{width: 48, background: ORANGE, color: CREAM, fontWeight: 800, fontSize: 18, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 8, letterSpacing: 1}}>AR</div>
              <div style={{padding: '4px 26px 8px', color: INK, fontWeight: 800, fontSize: 56, letterSpacing: -2}}>Yalla</div>
            </div>
            <span key={cap} style={{fontWeight: 600, fontSize: 38, color: ORANGE, letterSpacing: -0.5}}>{meaning}</span>
          </div>
          <div style={{position: 'absolute', left: 60, top: 386, width: 640, fontFamily: SORA, opacity: Math.min(1, capIn * 1.4), transform: `translateY(${(1 - Math.min(1, capIn)) * 30}px)`}}>
            <div style={{fontWeight: 800, fontSize: fs, lineHeight: '92px', letterSpacing: '-0.045em', color: CREAM, whiteSpace: 'nowrap', transform: 'skewX(-8deg)', transformOrigin: '0 100%'}}>{ct}</div>
            <div style={{display: 'flex', gap: 10, margin: '12px 0 14px'}}>{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} style={{width: i < 2 ? 54 : 26, height: 8, borderRadius: 4, background: ORANGE, opacity: 1 - i * 0.12, transform: 'skewX(-24deg)'}} />)}</div>
            <div style={{fontWeight: 500, fontSize: 34, lineHeight: '46px', letterSpacing: '-0.02em', color: CREAM, opacity: 0.78, whiteSpace: 'nowrap'}}>{cs}</div>
          </div>
        </div>
      )}

      <div style={{position: 'absolute', left: dcx - 200, top: dcy - 200, width: 400, height: 400, opacity: dialIn, transform: `scale(${ds * (0.85 + 0.15 * dialIn)})`}}>
        <Dial f={f} label={label} labelAge={labelAge} go={goK} />
      </div>
      {dialIn > 0.2 && (
        <div style={{position: 'absolute', left: dcx - hubD / 2, top: dcy - hubD / 2, width: hubD, height: hubD, borderRadius: hubR + '%', background: hubBg, opacity: dialIn, boxShadow: lampK > 0 ? `0 0 ${60 * lampK}px ${12 * lampK}px rgba(34,197,94,0.55), 0 0 0 ${lampPulse * 70}px rgba(34,197,94,${0.4 * (1 - lampPulse)})` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'}}>
          {lampK === 0 && <div style={{width: hubD * 0.4, height: hubD * 0.4, borderRadius: '50%', background: INK}} />}
          {iconK > 0 && <Img src={staticFile('app-icon.png')} style={{width: hubD, height: hubD, opacity: iconK}} />}
        </div>
      )}

      <div style={{position: 'absolute', left: VL, top: VT, width: VW, height: VH, borderRadius: 50, overflow: 'hidden', background: INK, boxShadow: `0 0 0 4px rgba(255,91,26,0.6)`, opacity: Math.min(1, enter * 2) * fadePhone, transform: `scale(${(0.94 + 0.06 * Math.min(1, enter)) * (0.96 + 0.04 * fadePhone)})`}}>
        <Img src={staticFile('app/appbg.jpg')} style={{position: 'absolute', left: bgX, top: bgY, width: bgW, height: bgH, maxWidth: 'none'}} />
        <div style={{position: 'absolute', left: 0, top: 0, width: LW, height: LH, transformOrigin: '0 0', transform: `scale(${UIS})`}}>
          {vMenu.o > 0.01 && j <= 0 && <div style={{position: 'absolute', inset: 0, opacity: vMenu.o, transform: `scale(${vMenu.sc})`}}><MenuHero t={Math.max(0, f)} ft={f - S[0]} /></div>}
          {vLearn.o > 0.01 && j >= 1 && j <= 2 && (
            <div style={{position: 'absolute', inset: 0, opacity: vLearn.o, transform: `scale(${vLearn.sc})`}}>
              {j === 1 ? <LearnHero t={Math.max(0, t(1))} /> : <LearnPage {...LEARN} a1={0} a2={0} playing={0} playPress={0} t={0} />}
            </div>
          )}
          {j === 2 && <SettingsPage t={Math.max(0, t(2))} />}
          {vAuto.o > 0.01 && j === 3 && (() => {
            const lt = Math.max(0, t(3));
            const wi = Math.min(PHRASES.length - 1, Math.max(0, Math.floor((lt - WSTART) / WSTEP)));
            const wt = lt - WSTART - wi * WSTEP;
            const a1 = lt < WSTART ? 0 : audioEnv(Math.max(0, wt), 0, 5), a2 = lt < WSTART ? 0 : audioEnv(Math.max(0, wt), 5, 10);
            return <div style={{position: 'absolute', inset: 0, opacity: vAuto.o, transform: `scale(${vAuto.sc})`}}>
              <LearnPage {...LEARN} count={`${wi + 1} of 40 phrases`} pct={(wi + 1) / 40} w1={PHRASES[wi][0]} w2={PHRASES[wi][1]} a1={a1} a2={a2} playing={1} playPress={0} t={lt} />
            </div>;
          })()}
          {vQuiz.o > 0.01 && j === 4 && <div style={{position: 'absolute', inset: 0, opacity: vQuiz.o, transform: `scale(${vQuiz.sc})`}}><QuizPage t={Math.max(0, t(4))} q="Yalla" opts={['Wait for me', "Let's go!", 'Thank you', 'Good night']} ci={1} /></div>}
          {vPl.o > 0.01 && j === 5 && <div style={{position: 'absolute', inset: 0, opacity: vPl.o, transform: `scale(${vPl.sc})`}}><Playlist t={Math.max(0, t(5))} /></div>}
          {vSt.o > 0.01 && j === 6 && <div style={{position: 'absolute', inset: 0, opacity: vSt.o, transform: `scale(${vSt.sc})`}}><StatsPage t={Math.max(0, t(6))} lang="Arabic" flag="sa" /></div>}
          {vPk.o > 0.01 && j === 7 && <div style={{position: 'absolute', inset: 0, opacity: vPk.o, transform: `scale(${vPk.sc})`}}><PickerPage t={Math.max(0, t(7))} langs={PA} /></div>}
        </div>
      </div>

      {e >= 0 && (
        <>
          <div style={{position: 'absolute', left: 0, top: 962, width: 1080, textAlign: 'center', fontFamily: SORA, fontWeight: 800, fontSize: 164, letterSpacing: -8, color: CREAM, lineHeight: 1, whiteSpace: 'nowrap', transform: `translateY(${(1 - Math.min(1.04, gs)) * -90}px) scale(${Math.min(1, 0.9 + 0.1 * gs)})`, opacity: Math.min(1, gs * 1.6)}}>Get Sprind.</div>
          <div style={{position: 'absolute', left: 0, top: 1152, width: 1080, textAlign: 'center', fontFamily: SORA, fontWeight: 600, fontSize: 88, letterSpacing: -3, color: ORANGE, opacity: st, transform: `translateY(${(1 - st) * 40}px)`}}>Start now.</div>
          <Img src={staticFile('app-store-badge.png')} style={{position: 'absolute', left: 540 - 240, top: 1330, height: 142, transform: `scale(${bd}) translateY(${(1 - bd) * 60}px)`, opacity: Math.min(1, bd)}} />
        </>
      )}
    </AbsoluteFill>
  );
};

export const YallaVideo: React.FC = () => {
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
