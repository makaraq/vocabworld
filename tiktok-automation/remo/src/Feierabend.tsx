import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Easing, Img, delayRender, continueRender, interpolate, spring, staticFile, useCurrentFrame} from 'remotion';
import {S, E0, TOTAL, HOOK_END, STAMPS, PHRASES, WSTEP, WSTART} from './feierabendTimeline';
import {LANGS, audioEnv, GlassBox, Txt, Finger, useFinger, ChevR, Panel, Dots, Body, MenuPage, LearnPage, SettingsPage, QuizPage, StatsPage, PickerPage} from './Glass';
import {GI} from './glassIcons';

const ORANGE = '#FF5B1A', INK = '#0D0B0A', CREAM = '#FFF3E6', PAPER = '#FFFAF4';
const SORA = "'SoraV', sans-serif";
const UI = "'SpaceG', 'SoraV', sans-serif";
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const sp = (f: number, delay: number, cfg = {damping: 12, stiffness: 130, mass: 0.7}) => spring({frame: f - delay, fps: 30, config: cfg});
const E = Easing.bezier(0.16, 1, 0.3, 1);
const ease = (f: number, a: number, b: number) => E(interpolate(f, [a, b], [0, 1], clamp));
const io = (f: number, a: number, b: number) => Easing.inOut(Easing.cubic)(interpolate(f, [a, b], [0, 1], clamp));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const W = (a: number) => `rgba(255,255,255,${a})`;
const INKA = (a: number) => `rgba(13,11,10,${a})`;
export const FEIERABEND_TOTAL = TOTAL;

/* ---------- geometry: card on top, phone below ---------- */
const CX = 50, CY = 236, CW = 980, CH = 400;
const PL = 142, PT = 668, PW = 796, UIS = PW / 393, LW = 393, LH = 560, PH = Math.round(LH * UIS);
const PT_LANGS: [string, string][] = (() => { const a = LANGS.slice(); const gi = a.findIndex((x) => x[0] === 'German'); const tmp = a[41]; a[41] = a[gi]; a[gi] = tmp; return a; })();
const mmss = (f: number) => { const s = Math.floor(f / 30); return `0:${String(s).padStart(2, '0')}`; };
const sx = (f: number) => 34 + (900 * f) / TOTAL; // strip x in card-local px (1 px per frame)

const CAPS: [string, string][] = [
  ['Clock in.', 'Open the First Aid Kit. Tap Time.'],
  ['Press play.', 'German first. Then English.'],
  ['Tighten the pauses.', 'From 7.3 seconds down to 2.2.'],
  ['Autoplay does the rest.', 'A sorted set, all in one go.'],
  ['Did it stick?', 'One tap. Instant answer.'],
  ['Keep it for later.', 'Feierabend joins Everyday German.'],
  ['Time well spent.', 'Words, streaks, badges.'],
  ['Fifty languages on shift.', 'Today: German. Pick your next.'],
  ['Clocked out.', 'Half a minute. Feierabend.'],
];

/* ---------- clock face ---------- */
const polar = (cx: number, cy: number, r: number, a: number) => [cx + r * Math.sin((a * Math.PI) / 180), cy - r * Math.cos((a * Math.PI) / 180)];
const Clock: React.FC<{d: number; min?: number; hour?: number; sec?: number | null; handsO?: number; wedge?: number; wedgeColor?: string}> = ({d, min = 0, hour = 0, sec = null, handsO = 1, wedge = 0, wedgeColor = ORANGE}) => {
  const c = 100;
  const wp = (() => {
    if (wedge <= 0.1) return '';
    if (wedge >= 359.9) return `M ${c} ${c - 92} A 92 92 0 1 1 ${c - 0.01} ${c - 92} Z`;
    const [x, y] = polar(c, c, 92, wedge);
    return `M ${c} ${c} L ${c} ${c - 92} A 92 92 0 ${wedge > 180 ? 1 : 0} 1 ${x} ${y} Z`;
  })();
  return (
    <svg width={d} height={d} viewBox="0 0 200 200" style={{display: 'block', overflow: 'visible'}}>
      <circle cx={c} cy={c} r={97} fill={PAPER} stroke={INK} strokeWidth={5} />
      {wp && <path d={wp} fill={wedgeColor} />}
      {Array.from({length: 60}, (_, i) => {
        const major = i % 5 === 0;
        const [x1, y1] = polar(c, c, major ? 78 : 85, i * 6);
        const [x2, y2] = polar(c, c, 91, i * 6);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK} strokeWidth={major ? 3.2 : 1.2} strokeLinecap="round" />;
      })}
      {Array.from({length: 12}, (_, i) => {
        const [x, y] = polar(c, c, 63, (i + 1) * 30);
        return <text key={i} x={x} y={y + 6} textAnchor="middle" fontFamily={SORA} fontWeight={800} fontSize={17} fill={INK}>{i + 1}</text>;
      })}
      <g opacity={handsO}>
        <line x1={c} y1={c} x2={polar(c, c, 46, hour)[0]} y2={polar(c, c, 46, hour)[1]} stroke={INK} strokeWidth={8} strokeLinecap="round" />
        <line x1={c} y1={c} x2={polar(c, c, 76, min)[0]} y2={polar(c, c, 76, min)[1]} stroke={INK} strokeWidth={5} strokeLinecap="round" />
      </g>
      {sec !== null && <line x1={c} y1={c} x2={polar(c, c, 84, sec)[0]} y2={polar(c, c, 84, sec)[1]} stroke={ORANGE} strokeWidth={3} strokeLinecap="round" />}
      <circle cx={c} cy={c} r={6} fill={INK} />
    </svg>
  );
};

/* ---------- hook: an hour a day vs 30 seconds ---------- */
const Hook: React.FC<{f: number}> = ({f}) => {
  const out = ease(f, 78, 88);
  const l1 = (i: number) => sp(f, -7 + i * 4, {damping: 15, stiffness: 160, mass: 0.7});
  const swap = ease(f, 50, 57);
  const minA = 1080 * io(f, 0, 52);
  const hourA = 300 + minA / 12;
  const handsO = 1 - ease(f, 52, 60);
  const wedge = 180 * io(f, 58, 84);
  const secA = f < 58 ? null : wedge;
  const slam = f >= 52 && f < 62 ? 1 - 0.035 * Math.sin(((f - 52) / 10) * Math.PI) : 1;
  const l2 = (i: number) => sp(f, 54 + i * 4, {damping: 14, stiffness: 170, mass: 0.7});
  const big = ease(f, 66, 74);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: 1 - out, transform: `scale(${1 - 0.03 * out})`}}>
      <div style={{position: 'absolute', left: 80, top: 250, width: 920, opacity: 1 - swap, fontFamily: SORA, fontWeight: 800, fontSize: 92, lineHeight: '106px', letterSpacing: '-0.05em', color: INK}}>
        {['Everyone says', 'you need an hour', 'a day.'].map((t, i) => (
          <div key={i} style={{opacity: Math.min(1, l1(i) * 1.5), transform: `translateY(${(1 - Math.min(1, l1(i))) * 44}px)`, color: i === 2 ? ORANGE : INK, whiteSpace: 'nowrap'}}>{t}</div>
        ))}
      </div>
      <div style={{position: 'absolute', left: 80, top: 250, width: 920, fontFamily: SORA, fontWeight: 800, fontSize: 124, lineHeight: '136px', letterSpacing: '-0.055em'}}>
        {['You have', '30 seconds.'].map((t, i) => (
          <div key={i} style={{opacity: Math.min(1, l2(i) * 1.5) * swap, transform: `translateY(${(1 - Math.min(1, l2(i))) * 50}px)`, color: i === 1 ? ORANGE : INK, whiteSpace: 'nowrap'}}>{t}</div>
        ))}
      </div>
      <div style={{position: 'absolute', left: 540 - 360, top: 1010 - 360 + 40, transform: `scale(${slam})`}}>
        <Clock d={720} min={minA} hour={hourA} sec={secA} handsO={handsO} wedge={wedge} />
        <div style={{position: 'absolute', left: 372, top: 296, width: 220, textAlign: 'center', fontFamily: SORA, fontWeight: 800, fontSize: 150, letterSpacing: '-0.06em', color: PAPER, opacity: big, transform: `scale(${0.8 + 0.2 * big})`}}>30</div>
      </div>
    </div>
  );
};

/* ---------- the time card (hero word is the header; time strip is the progress device) ---------- */
const Card: React.FC<{f: number; j: number}> = ({f, j}) => {
  const e = f - E0;
  const capIdx = Math.min(8, Math.max(0, j));
  const [ct, cs] = CAPS[capIdx];
  const start = capIdx === 8 ? E0 : S[Math.max(0, capIdx)];
  const next = capIdx >= 8 ? 99999 : capIdx === 7 ? E0 : S[capIdx + 1];
  const ci = Math.min(ease(f, start + 1, start + 10), 1 - ease(f, next - 5, next));
  const capUp = (1 - ci) * 22;
  const fs = Math.min(64, 900 / (ct.length * 0.56));
  const flyIn = f >= S[5] + 8 && f < S[5] + 34 ? Math.min(ease(f, S[5] + 8, S[5] + 14), 1 - ease(f, S[5] + 30, S[5] + 36)) : 0;
  const tunedO = ease(f, S[2] + 86, S[2] + 92) * (1 - ease(f, S[3] + 82, S[3] + 92));
  const tunedP = sp(f, S[2] + 86, {damping: 9, stiffness: 200, mass: 0.6});
  const needleX = sx(Math.min(f, TOTAL));
  const open = ease(f, S[0] - 6, S[0] + 6);
  const pop = sp(f, S[0] - 6, {damping: 16, stiffness: 120, mass: 0.9});
  return (
    <div style={{position: 'absolute', left: CX, top: CY, width: CW, height: CH, boxSizing: 'border-box', border: `6px solid ${INK}`, borderRadius: 30, background: PAPER, boxShadow: `10px 10px 0 ${INK}`, overflow: 'hidden', opacity: open, transform: `scale(${0.95 + 0.05 * Math.min(1, pop)})`}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: 968, height: 98, background: INK}}>
        <div style={{position: 'absolute', left: 34, top: 0, lineHeight: '98px', fontFamily: SORA, fontWeight: 800, fontSize: 70, letterSpacing: '-0.05em', color: CREAM, opacity: 1 - 0.7 * flyIn, whiteSpace: 'nowrap'}}>Feierabend</div>
        <div style={{position: 'absolute', right: 34, top: 0, lineHeight: '98px', fontFamily: SORA, fontWeight: 600, fontSize: 30, letterSpacing: '-0.02em', color: ORANGE, whiteSpace: 'nowrap'}}>done for the day</div>
      </div>
      <div style={{position: 'absolute', left: 34, top: 112, width: 900, opacity: ci, transform: `translateY(${capUp}px)`, fontFamily: SORA, whiteSpace: 'nowrap'}}>
        <div style={{fontWeight: 800, fontSize: fs, lineHeight: '74px', letterSpacing: '-0.05em', color: INK}}>{ct}</div>
        <div style={{fontWeight: 500, fontSize: 32, lineHeight: '44px', letterSpacing: '-0.02em', color: ORANGE, marginTop: 4}}>{cs}</div>
      </div>
      {tunedO > 0.01 && (
        <div style={{position: 'absolute', right: 40, top: 178, padding: '4px 18px 6px', border: `4px solid ${ORANGE}`, borderRadius: 14, fontFamily: SORA, fontWeight: 800, fontSize: 32, letterSpacing: '0.04em', color: ORANGE, opacity: tunedO, transform: `rotate(-6deg) scale(${1 + 0.5 * (1 - Math.min(1.05, tunedP))})`}}>TUNED</div>
      )}
      {/* time strip: 0:00 to 0:30, one pixel per frame */}
      <div style={{position: 'absolute', left: 34, top: 312, width: 900, height: 4, background: INK}} />
      {Array.from({length: 31}, (_, i) => <div key={i} style={{position: 'absolute', left: 34 + i * 30 - 1.5, top: 316, width: 3, height: i % 5 === 0 ? 16 : 9, background: INK, opacity: i % 5 === 0 ? 1 : 0.5}} />)}
      {STAMPS.map((sf, i) => {
        const x = sx(sf);
        const st = f - sf;
        const lit = st >= 0;
        const k = lit ? 1 + 0.9 * (1 - ease(st, 0, 7)) : 1;
        const ring = lit && st < 12 ? st / 12 : -1;
        return (
          <React.Fragment key={i}>
            <div style={{position: 'absolute', left: x - 22, top: 252, width: 44, height: 44, boxSizing: 'border-box', borderRadius: 11, border: lit ? `4px solid ${INK}` : `3px dashed ${INKA(0.28)}`, background: lit ? ORANGE : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SORA, fontWeight: 800, fontSize: 24, color: lit ? INK : INKA(0.28), opacity: lit ? Math.min(1, st / 2 + 0.2) : 1, transform: `scale(${k})`}}>{i + 1}</div>
            {ring >= 0 && <div style={{position: 'absolute', left: x - 22 - ring * 30, top: 252 - ring * 30, width: 44 + ring * 60, height: 44 + ring * 60, borderRadius: 14 + ring * 20, border: `4px solid ${INK}`, boxSizing: 'border-box', opacity: 0.5 * (1 - ring)}} />}
            <div style={{position: 'absolute', left: x - 30, top: 338, width: 60, textAlign: 'center', fontFamily: SORA, fontWeight: 700, fontSize: 20, color: INK, opacity: lit ? Math.min(1, st / 6) : 0}}>{mmss(sf)}</div>
          </React.Fragment>
        );
      })}
      <div style={{position: 'absolute', left: needleX - 2, top: 240, width: 4, height: 82, background: INK}} />
      <div style={{position: 'absolute', left: needleX - 10, top: 228, width: 20, height: 20, borderRadius: 10, background: ORANGE, border: `4px solid ${INK}`, boxSizing: 'border-box'}} />
    </div>
  );
};

/* ---------- learning page (compressed audio beats) ---------- */
const LearnFB: React.FC<{t: number}> = ({t}) => {
  const f = useFinger(t, [300, 500], [196, 436], 6, 18, 22, 90);
  const playing = t >= 23 ? 1 : 0;
  const a1 = audioEnv(t, 26, 52), a2 = audioEnv(t, 54, 80);
  return (
    <LearnPage title="Time" icon="Time" count="1 of 40 words" pct={1 / 40} chip="EVERYDAY GERMAN" l1="German" w1="Feierabend" l2="English" w2="Done for the day" a1={a1} a2={a2} playing={playing} playPress={f.press} t={t}
      pressFinger={<><Finger x={f.x} y={f.y} show={f.show} press={f.press} /><div style={{position: 'absolute', left: 196, top: 436}}>{f.rp}</div></>} />
  );
};

const rowY = (i: number) => 258 + i * 60;
const Playlist: React.FC<{t: number}> = ({t}) => {
  const lists: [string, number][] = [['Nightmare', 33], ['Everyday German', 21], ['Fancy Words', 14]];
  const land = t >= 30 ? ease(t, 30, 38) : 0;
  const bump = t >= 30 && t < 40 ? 1 + 0.08 * Math.sin(((t - 30) / 10) * Math.PI) : 1;
  const f = useFinger(t, [330, 470], [196, rowY(1) + 26], 44, 56, 58, 14);
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
      <Dots cur={7} />
      <Finger x={f.x} y={f.y} show={f.show} press={f.press} /><div style={{position: 'absolute', left: 196, top: rowY(1) + 26}}>{f.rp}</div>
    </>
  );
};

/* ---------- ending: clock-out ---------- */
const Stamp: React.FC<{e: number; at: number; cx: number; cy: number; w: number; h: number; rot: number; bg: string; fg: string; size: number; border?: string; children: React.ReactNode}> = ({e, at, cx, cy, w, h, rot, bg, fg, size, border, children}) => {
  const q = e - at;
  if (q < -1) return null;
  const p = ease(q, 0, 6);
  const sc = 1 + 0.4 * (1 - p);
  const ring = q >= 0 && q < 14 ? q / 14 : -1;
  return (
    <>
      <div style={{position: 'absolute', left: cx - w / 2, top: cy - h / 2, width: w, height: h, borderRadius: 26, boxSizing: 'border-box', background: bg, border: border ?? 'none', color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SORA, fontWeight: 800, fontSize: size, letterSpacing: '-0.05em', whiteSpace: 'nowrap', opacity: Math.min(1, q / 3 + 0.3), transform: `rotate(${rot}deg) scale(${sc})`}}>{children}</div>
      {ring >= 0 && <div style={{position: 'absolute', left: cx - w / 2 - ring * 50, top: cy - h / 2 - ring * 50, width: w + ring * 100, height: h + ring * 100, borderRadius: 26 + ring * 50, border: `6px solid ${INK}`, boxSizing: 'border-box', opacity: 0.35 * (1 - ring), transform: `rotate(${rot}deg)`}} />}
    </>
  );
};
const Ending: React.FC<{e: number}> = ({e}) => {
  const shake = (at: number) => (e >= at && e < at + 12 ? 9 * Math.exp(-(e - at) / 3) * Math.cos((e - at) * 1.6) : 0);
  const sh = shake(40) + shake(74);
  const clockO = ease(e, 2, 14) * (1 - 0.68 * ease(e, 40, 47));
  const minA = lerp(330, 360, io(e, 8, 32));
  const hourA = lerp(147.5, 150, io(e, 8, 32));
  const ic = sp(e, 98, {damping: 11, stiffness: 140, mass: 0.8});
  const bd = sp(e, 112, {damping: 13, stiffness: 120, mass: 0.7});
  return (
    <div style={{position: 'absolute', inset: 0, transform: `translateY(${sh}px)`}}>
      <div style={{position: 'absolute', left: 540 - 230, top: 905 - 230, opacity: clockO, transform: `scale(${0.94 + 0.06 * ease(e, 2, 14)})`}}>
        <Clock d={460} min={minA} hour={hourA} sec={null} />
      </div>
      <Stamp e={e} at={40} cx={540} cy={905} w={900} h={210} rot={-4} bg={ORANGE} fg={INK} size={134} border={`8px solid ${INK}`}>Get Sprind.</Stamp>
      <Stamp e={e} at={74} cx={540} cy={1085} w={560} h={124} rot={2.5} bg={INK} fg={CREAM} size={80}>Start now.</Stamp>
      <Img src={staticFile('app-icon.png')} style={{position: 'absolute', left: 540 - 85, top: 1190, width: 170, height: 170, borderRadius: 40, border: `5px solid ${INK}`, boxSizing: 'border-box', opacity: Math.min(1, ic * 1.4), transform: `scale(${0.8 + 0.2 * Math.min(1.05, ic)})`}} />
      <Img src={staticFile('app-store-badge.png')} style={{position: 'absolute', left: 540 - 236, top: 1392, height: 140, opacity: Math.min(1, bd * 1.4), transform: `scale(${0.9 + 0.1 * Math.min(1.03, bd)})`}} />
    </div>
  );
};

/* ---------- main ---------- */
const Main: React.FC = () => {
  const f = useCurrentFrame();
  const e = f - E0;
  const j = f >= E0 ? 8 : S.reduce((a, s, i) => (f >= s ? i : a), -1);
  const t = (jj: number) => Math.max(0, f - S[jj]);
  const pv = (start: number, end: number) => {
    const inn = interpolate(f, [start, start + 7], [0, 1], clamp);
    const out = interpolate(f, [end - 1, end + 6], [1, 0], clamp);
    const o = Math.min(inn, out);
    return {o, sc: 0.95 + 0.05 * o};
  };
  const vMenu = pv(S[0] - 10, S[1]);
  const vLearn = pv(S[1], S[3]);
  const vAuto = pv(S[3], S[4]);
  const vQuiz = pv(S[4], S[5]);
  const vPl = pv(S[5], S[6]);
  const vSt = pv(S[6], S[7]);
  const vLang = pv(S[7], E0 + 2);
  const enter = sp(f, S[0] - 8, {damping: 16, stiffness: 110, mass: 0.9});
  const phoneO = ease(f, S[0] - 8, S[0] + 2) * (1 - ease(e, 0, 12));
  const bgH = 1800, bgW = bgH * (4266 / 2400);
  const bgX = -(bgW - PW) * (0.72 + 0.22 * (f / TOTAL));
  const bgY = -(bgH - PW * (LH / LW)) * 0.55;
  // hero word flies from the card header to the playlist row
  const t5 = f - S[5];
  const fly = io(t5, 10, 30);
  const flyO = t5 >= 8 && t5 < 36 ? Math.min(ease(t5, 8, 13), 1 - ease(t5, 30, 36)) : 0;
  const fx0 = CX + 6 + 34 + 200, fy0 = CY + 6 + 49;
  const fx1 = PL + 196 * UIS, fy1 = PT + (rowY(1) + 26) * UIS;
  const fxx = lerp(fx0, fx1, fly), fyy = lerp(fy0, fy1, fly) - 120 * Math.sin(fly * Math.PI);
  const fsc = lerp(1, 0.62, fly);

  return (
    <AbsoluteFill style={{background: CREAM}}>
      {f < HOOK_END && <Hook f={f} />}
      {f >= S[0] - 8 && <Card f={f} j={j} />}

      <div style={{position: 'absolute', left: PL, top: PT, width: PW, height: PH, borderRadius: 52, overflow: 'hidden', background: INK, boxShadow: `0 0 0 8px ${INK}`, opacity: phoneO, transform: `scale(${(0.94 + 0.06 * Math.min(1, enter)) * (1 - 0.04 * ease(e, 0, 12))})`, display: f >= S[0] - 8 && e < 14 ? 'block' : 'none'}}>
        <Img src={staticFile('app/appbg.jpg')} style={{position: 'absolute', left: bgX, top: bgY, width: bgW, height: bgH, maxWidth: 'none'}} />
        <div style={{position: 'absolute', left: 0, top: 0, width: LW, height: LH, transformOrigin: '0 0', transform: `scale(${UIS})`}}>
          {vMenu.o > 0.01 && j <= 0 && <div style={{position: 'absolute', inset: 0, opacity: vMenu.o, transform: `scale(${vMenu.sc})`}}><MenuPage t={Math.max(0, t(0))} pick={2} /></div>}
          {vLearn.o > 0.01 && j >= 1 && j <= 2 && (
            <div style={{position: 'absolute', inset: 0, opacity: vLearn.o, transform: `scale(${vLearn.sc})`}}>
              {j === 1 ? <LearnFB t={t(1)} /> : <LearnPage title="Time" icon="Time" count="1 of 40 words" pct={1 / 40} chip="EVERYDAY GERMAN" l1="German" w1="Feierabend" l2="English" w2="Done for the day" a1={0} a2={0} playing={0} playPress={0} t={0} />}
            </div>
          )}
          {j === 2 && <SettingsPage t={t(2)} />}
          {vAuto.o > 0.01 && j === 3 && (() => {
            const lt = t(3);
            const wi = Math.min(PHRASES.length - 1, Math.max(0, Math.floor((lt - WSTART) / WSTEP)));
            const wt = lt - WSTART - wi * WSTEP;
            const a1 = lt < WSTART ? 0 : audioEnv(Math.max(0, wt), 0, 5), a2 = lt < WSTART ? 0 : audioEnv(Math.max(0, wt), 5, 10);
            return <div style={{position: 'absolute', inset: 0, opacity: vAuto.o, transform: `scale(${vAuto.sc})`}}>
              <LearnPage title="Time" icon="Time" count={`${wi + 1} of 40 words`} pct={(wi + 1) / 40} chip="EVERYDAY GERMAN" l1="German" w1={PHRASES[wi][0]} l2="English" w2={PHRASES[wi][1]} a1={a1} a2={a2} playing={1} playPress={0} t={lt} />
            </div>;
          })()}
          {vQuiz.o > 0.01 && j === 4 && <div style={{position: 'absolute', inset: 0, opacity: vQuiz.o, transform: `scale(${vQuiz.sc})`}}><QuizPage t={t(4)} q="Feierabend" opts={['Holiday', 'Done for the day', 'Lunch break', 'Overtime']} ci={1} /></div>}
          {vPl.o > 0.01 && j === 5 && <div style={{position: 'absolute', inset: 0, opacity: vPl.o, transform: `scale(${vPl.sc})`}}><Playlist t={t(5)} /></div>}
          {vSt.o > 0.01 && j === 6 && <div style={{position: 'absolute', inset: 0, opacity: vSt.o, transform: `scale(${vSt.sc})`}}><StatsPage t={t(6)} lang="German" flag="de" /></div>}
          {vLang.o > 0.01 && j === 7 && <div style={{position: 'absolute', inset: 0, opacity: vLang.o, transform: `scale(${vLang.sc})`}}><PickerPage t={t(7)} langs={PT_LANGS} target={41} /></div>}
        </div>
      </div>

      {flyO > 0.01 && (
        <div style={{position: 'absolute', left: fxx, top: fyy, transform: `translate(-50%,-50%) scale(${fsc})`, opacity: flyO, padding: '8px 30px 12px', borderRadius: 40, background: INK, color: CREAM, fontFamily: SORA, fontWeight: 800, fontSize: 56, letterSpacing: '-0.04em', whiteSpace: 'nowrap', boxShadow: `6px 6px 0 ${ORANGE}`}}>Feierabend</div>
      )}

      {e >= -2 && <Ending e={e} />}
    </AbsoluteFill>
  );
};

export const FeierabendVideo: React.FC = () => {
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
    <AbsoluteFill style={{background: CREAM, fontFamily: UI}}>
      <Main />
    </AbsoluteFill>
  );
};
