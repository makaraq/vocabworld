import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Easing, Img, delayRender, continueRender, interpolate, spring, staticFile, useCurrentFrame} from 'remotion';
import {S, E0, TOTAL, HK, HK0, HKSTEP, HK_MORPH, TAGS, TAGAT, COUNTS, PHRASES, WSTEP, WSTART} from './daebakTimeline';
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
export const DAEBAK_TOTAL = TOTAL;

const VL = 120, VT = 618, VW = 840, UIS = VW / 393, LW = 393, LH = 560, VH = Math.round(LH * UIS);
const PT: [string, string][] = (() => { const a = LANGS.slice(); const ti = a.findIndex((x) => x[0] === 'Korean'); const tmp = a[41]; a[41] = a[ti]; a[ti] = tmp; return a; })();
const CAPS: [string, string][] = [
  ['Open the First Aid Kit.', 'Tap Greetings. Everyday slang lives here.'],
  ['Hear it. Say it back.', 'Press play. Daebak, out loud.'],
  ['Tighten the gaps.', 'Drag the pause from long to short.'],
  ['A whole thread. One go.', 'Autoplay: a sorted set of reactions.'],
  ['Does it stick?', 'One tap. Instant answer.'],
  ['Pin the good ones.', 'Daebak joins Daily reactions.'],
  ['Watch the count climb.', 'Words, streaks, badges.'],
  ['Join one of fifty.', '50 languages, one wow each.'],
];
const AV = ['M', 'J', 'A', 'S', 'L', 'K', 'D', 'Y', 'R'];
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

const LearnPhrase: React.FC<{t: number}> = ({t}) => {
  const f = useFinger(t, [300, 500], [196, 436], 10, 26, 28, 90);
  const playing = t >= 29 && t < 118 ? 1 : 0;
  const a1 = audioEnv(t, 32, 72), a2 = audioEnv(t, 74, 114);
  return (
    <LearnPage title="Greetings" icon="Greetings" count="1 of 40 phrases" pct={1 / 40} chip="EVERYDAY KOREAN" l1="Korean" w1="Daebak" l2="English" w2="Wow! Awesome!" a1={a1} a2={a2} playing={playing} playPress={f.press} t={t}
      pressFinger={<><Finger x={f.x} y={f.y} show={f.show} press={f.press} /><div style={{position: 'absolute', left: 196, top: 436}}>{f.rp}</div></>} />
  );
};

const rowY = (i: number) => 258 + i * 60;
const Playlist: React.FC<{t: number}> = ({t}) => {
  const lists: [string, number][] = [['Nightmare', 33], ['Daily reactions', 11], ['Fancy Words', 14]];
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
            <Txt x={16} y={29} size={12} color={i === 1 && t >= 30 ? CREAM : W(0.5)}>{cnt} phrases</Txt>
            <div style={{position: 'absolute', right: 14, top: 14}}><ChevR size={22} color={W(0.5)} /></div>
          </div>
        );
      })}
      {t >= 12 && t < 36 && (
        <div style={{position: 'absolute', left: 196 - 70, top: cy - 20, width: 140, height: 40, borderRadius: 20, background: W(0.28), border: `1.5px solid ${CREAM}`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: UI, fontWeight: 600, fontSize: 17, color: '#fff', backdropFilter: 'blur(8px)', transform: `scale(${1 - 0.15 * fly})`, opacity: 1 - ease(t, 30, 36)}}>Daebak</div>
      )}
      <Dots cur={7} />
      <Finger x={f.x} y={f.y} show={f.show} press={f.press} /><div style={{position: 'absolute', left: 196, top: rowY(1) + 26}}>{f.rp}</div>
    </>
  );
};

/* ---------- feed bits ---------- */
const Avatar: React.FC<{x: number; y: number; d: number; letter: string; dark?: boolean; s?: number; ring?: boolean}> = ({x, y, d, letter, dark, s = 1, ring}) => (
  <div style={{position: 'absolute', left: x, top: y, width: d, height: d, borderRadius: d / 2, background: dark ? INK : CREAM, color: dark ? CREAM : INK, border: ring ? `4px solid ${ORANGE}` : undefined, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SORA, fontWeight: 800, fontSize: d * 0.42, transform: `scale(${s})`}}>{letter}</div>
);
const Bubble: React.FC<{x: number; y: number; w?: number; label?: string; text: string; size: number; dark?: boolean; s?: number; o?: number; ox?: number; right?: boolean}> = ({x, y, w, label, text, size, dark, s = 1, o = 1, ox = 0, right}) => (
  <div style={{position: 'absolute', ...(right ? {right: x} : {left: x}), top: y, width: w, padding: `${label ? 12 : 16}px 30px 18px`, borderRadius: 44, borderBottomLeftRadius: right ? 44 : 10, borderBottomRightRadius: right ? 10 : 44, background: dark ? INK : CREAM, color: dark ? CREAM : INK, fontFamily: SORA, boxSizing: 'border-box', whiteSpace: 'nowrap', opacity: o, transform: `translateX(${ox}px) scale(${s})`, transformOrigin: right ? 'right bottom' : 'left bottom'}}>
    {label && <div style={{fontWeight: 600, fontSize: 24, opacity: 0.55, letterSpacing: 0, lineHeight: '28px'}}>{label}</div>}
    <div style={{fontWeight: 800, fontSize: size, letterSpacing: '-0.04em', lineHeight: `${size * 1.15}px`}}>{text}</div>
  </div>
);

const PILL = {x: 60, y: 250, w: 270, h: 78};
const HOOK_Y = (i: number) => 590 + i * 122;

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
  const vMenu = pv(S[0] - 6, S[1]);
  const vLearn = pv(S[1], S[3]);
  const vAuto = pv(S[3], S[4]);
  const vQuiz = pv(S[4], S[5]);
  const vPl = pv(S[5], S[6]);
  const vSt = pv(S[6], S[7]);
  const vPk = pv(S[7], E0 + 6);
  const enter = ease(f, S[0] - 4, S[0] + 10);
  const phoneOut = ease(e, -4, 8);
  const bgH = 1800, bgW = bgH * (4266 / 2400);
  const bgX = -(bgW - VW) * (0.72 + 0.22 * (f / TOTAL));
  const bgY = -(bgH - VH) * 0.55;

  /* hook */
  const hookTextOut = ease(f, HK_MORPH + 4, HK_MORPH + 20);
  const n50 = Math.round(50 * ease(f, 4, 36));
  const morph = io(f, HK_MORPH, S[0] + 2);
  const hx = 154, hy = HOOK_Y(6);
  const heroSc = lerp(1.25, 1, morph);
  const heroX = lerp(hx, PILL.x, morph), heroY = lerp(hy, PILL.y, morph);
  const heroIn = sp(f, HK0 + 6 * HKSTEP, {damping: 11, stiffness: 150, mass: 0.7});
  const hookRowsOut = 1 - ease(f, HK_MORPH + 4, HK_MORPH + 20);

  /* header (counter etc.) */
  const hdr = ease(f, S[0] - 2, S[0] + 10);
  const nStops = Math.max(0, Math.min(7, j));
  const cStops = j < 0 ? -1 : j;
  let cv = 0;
  for (let k = 0; k <= 7; k++) {
    const a = k === 0 ? 0 : COUNTS[k - 1];
    if (f >= S[k]) cv = lerp(a, COUNTS[k], ease(f, S[k] + 12, S[k] + 52));
  }
  const comments = f >= E0 ? [E0 + 14, E0 + 36, E0 + 58, E0 + 82].filter((x) => f >= x).length : 0;
  cv += comments * 140;

  const cap = Math.max(0, Math.min(7, j));
  const [ct, cs] = CAPS[cap];
  const capIn = j >= 0 ? sp(f, S[j], {damping: 14, stiffness: 150, mass: 0.7}) : 0;
  const fs = Math.min(60, 880 / (ct.length * 0.56));
  const capOut = 1 - ease(e, 0, 10);
  const tagIdx = TAGAT.reduce((a, x, i) => (f >= x ? i : a), -1);
  const tagPop = tagIdx >= 0 ? sp(f, TAGAT[tagIdx], {damping: 10, stiffness: 190, mass: 0.6}) : 0;

  /* ending */
  const cm = (at: number) => sp(f, at, {damping: 13, stiffness: 150, mass: 0.7});
  const c1 = cm(E0 + 14), c2 = cm(E0 + 36), c3 = cm(E0 + 58), c4 = cm(E0 + 82);
  const icon = sp(f, E0 + 100, {damping: 10, stiffness: 140, mass: 0.8});
  const bd = sp(f, E0 + 116, {damping: 12, stiffness: 120, mass: 0.7});

  return (
    <AbsoluteFill style={{background: ORANGE}}>
      {/* hook headline */}
      {f < HK_MORPH + 24 && (
        <div style={{position: 'absolute', left: 60, top: 240, opacity: 1 - hookTextOut, transform: `translateY(${-hookTextOut * 60}px)`, fontFamily: SORA, fontWeight: 800, fontSize: 104, lineHeight: '124px', letterSpacing: '-0.06em', color: INK, whiteSpace: 'nowrap'}}>
          <div style={{opacity: ease(f, 0, 8)}}>Wow has</div>
          <div style={{opacity: ease(f, 3, 11)}}><span style={{color: CREAM}}>{n50}</span> translations.</div>
        </div>
      )}
      {/* hook comment stack */}
      {f < HK_MORPH + 24 && HK.slice(0, 6).map(([c, lang, w], i) => {
        const a = sp(f, HK0 + i * HKSTEP, {damping: 13, stiffness: 160, mass: 0.7});
        if (f < HK0 + i * HKSTEP) return null;
        const right = i % 2 === 1;
        const y = HOOK_Y(i);
        return (
          <React.Fragment key={w}>
            <div style={{opacity: hookRowsOut}}>
              <div style={{position: 'absolute', ...(right ? {right: 60} : {left: 60}), top: y, width: 80, height: 80}}><Avatar x={0} y={0} d={80} letter={c} dark={i % 2 === 1} s={Math.min(1, a)} /></div>
              <Bubble x={right ? 60 + 80 + 14 : 154} y={y - 10} right={right} label={lang} text={w} size={50} s={Math.min(1.03, a)} o={Math.min(1, a * 1.5)} ox={(1 - Math.min(1, a)) * (right ? 40 : -40)} />
            </div>
          </React.Fragment>
        );
      })}
      {f >= HK0 + 6 * HKSTEP && f < HK_MORPH + 24 && (
        <div style={{opacity: hookRowsOut}}>
          <div style={{position: 'absolute', left: 60, top: hy, width: 80, height: 80}}><Avatar x={0} y={0} d={80} letter="KR" dark s={Math.min(1, heroIn)} /></div>
          <div style={{position: 'absolute', left: 154, top: hy - 52, fontFamily: SORA, fontWeight: 600, fontSize: 24, color: INK, opacity: 0.6}}>Korean</div>
        </div>
      )}

      {f >= S[0] - 4 && (
        <>
          <div style={{position: 'absolute', left: PILL.x + PILL.w + 22, top: PILL.y + 14, fontFamily: SORA, fontWeight: 600, fontSize: 40, letterSpacing: '-0.02em', color: INK, opacity: 0.8 * hdr, whiteSpace: 'nowrap'}}>= wow / awesome</div>
          {tagIdx >= 0 && f < E0 + 6 && (
            <div key={tagIdx} style={{position: 'absolute', right: 60, top: PILL.y + 6, height: 66, padding: '0 28px 0 22px', borderRadius: 33, background: CREAM, color: INK, fontFamily: SORA, fontWeight: 800, fontSize: 36, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10, transform: `scale(${Math.min(1.06, tagPop)})`, transformOrigin: 'right center', opacity: Math.min(1, tagPop * 1.6) * (1 - ease(e, 0, 8))}}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>{TAGS[tagIdx]}
            </div>
          )}
          {/* live reaction counter + reactors */}
          <div style={{position: 'absolute', left: 60, top: 332, display: 'flex', alignItems: 'baseline', gap: 16, fontFamily: SORA, color: INK, opacity: hdr, whiteSpace: 'nowrap'}}>
            <span style={{fontWeight: 800, fontSize: 112, letterSpacing: '-0.03em', lineHeight: '112px', fontVariantNumeric: 'tabular-nums'}}>{fmt(cv)}</span>
            <span style={{fontWeight: 600, fontSize: 40, letterSpacing: '-0.02em', opacity: 0.75}}>reactions</span>
          </div>
          <div style={{position: 'absolute', left: 0, top: 350, width: 1080, opacity: hdr}}>
            {AV.slice(0, 8).map((l, i) => {
              if (f < S[i] + 14) return null;
              const a = sp(f, S[i] + 14, {damping: 10, stiffness: 190, mass: 0.6});
              return <Avatar key={i} x={690 + i * 40} y={2} d={56} letter={l} dark={i % 2 === 0} ring s={Math.min(1.08, a)} />;
            })}
          </div>
        </>
      )}

      {/* caption bubble */}
      {j >= 0 && (
        <div style={{position: 'absolute', left: 60, top: 452, width: 960, height: 132, boxSizing: 'border-box', padding: '14px 36px', borderRadius: 48, borderBottomLeftRadius: 12, background: CREAM, fontFamily: SORA, color: INK, opacity: Math.min(1, ease(f, S[0] - 2, S[0] + 10)) * capOut, transform: `translateY(${(1 - Math.min(1, capIn)) * 22}px)`}}>
          <div key={cap} style={{opacity: Math.min(1, capIn * 1.5)}}>
            <div style={{fontWeight: 800, fontSize: fs, lineHeight: '66px', letterSpacing: '-0.05em', whiteSpace: 'nowrap'}}>{ct}</div>
            <div style={{fontWeight: 500, fontSize: 30, lineHeight: '40px', letterSpacing: '-0.01em', opacity: 0.62, whiteSpace: 'nowrap'}}>{cs}</div>
          </div>
        </div>
      )}

      {/* phone */}
      <div style={{position: 'absolute', left: VL, top: VT, width: VW, height: VH, borderRadius: 56, overflow: 'hidden', background: INK, boxShadow: `0 0 0 14px ${INK}`, opacity: enter * (1 - phoneOut), transform: `scale(${(0.95 + 0.05 * enter) * (1 - 0.05 * phoneOut)})`}}>
        <Img src={staticFile('app/appbg.jpg')} style={{position: 'absolute', left: bgX, top: bgY, width: bgW, height: bgH, maxWidth: 'none'}} />
        <div style={{position: 'absolute', left: 0, top: 0, width: LW, height: LH, transformOrigin: '0 0', transform: `scale(${UIS})`}}>
          {j <= 0 && vMenu.o > 0.01 && <div style={{position: 'absolute', inset: 0, opacity: vMenu.o, transform: `scale(${vMenu.sc})`}}><MenuPage t={Math.max(0, t(0))} pick={0} /></div>}
          {vLearn.o > 0.01 && j >= 1 && j <= 2 && (
            <div style={{position: 'absolute', inset: 0, opacity: vLearn.o, transform: `scale(${vLearn.sc})`}}>
              {j === 1 ? <LearnPhrase t={Math.max(0, t(1))} /> : <LearnPage title="Greetings" icon="Greetings" count="1 of 40 phrases" pct={1 / 40} chip="EVERYDAY KOREAN" l1="Korean" w1="Daebak" l2="English" w2="Wow! Awesome!" a1={0} a2={0} playing={0} playPress={0} t={0} />}
            </div>
          )}
          {j === 2 && <SettingsPage t={Math.max(0, t(2))} />}
          {vAuto.o > 0.01 && j === 3 && (() => {
            const lt = Math.max(0, t(3));
            const wi = Math.min(PHRASES.length - 1, Math.max(0, Math.floor((lt - WSTART) / WSTEP)));
            const wt = lt - WSTART - wi * WSTEP;
            const a1 = lt < WSTART ? 0 : audioEnv(Math.max(0, wt), 0, 5), a2 = lt < WSTART ? 0 : audioEnv(Math.max(0, wt), 5, 10);
            return <div style={{position: 'absolute', inset: 0, opacity: vAuto.o, transform: `scale(${vAuto.sc})`}}>
              <LearnPage title="Greetings" icon="Greetings" count={`${wi + 1} of 40 phrases`} pct={(wi + 1) / 40} chip="EVERYDAY KOREAN" l1="Korean" w1={PHRASES[wi][0]} l2="English" w2={PHRASES[wi][1]} a1={a1} a2={a2} playing={1} playPress={0} t={lt} />
            </div>;
          })()}
          {vQuiz.o > 0.01 && j === 4 && <div style={{position: 'absolute', inset: 0, opacity: vQuiz.o, transform: `scale(${vQuiz.sc})`}}><QuizPage t={Math.max(0, t(4))} q="Daebak" opts={['Sorry', 'Wow! Awesome!', "Let's eat", 'Goodbye']} ci={1} /></div>}
          {vPl.o > 0.01 && j === 5 && <div style={{position: 'absolute', inset: 0, opacity: vPl.o, transform: `scale(${vPl.sc})`}}><Playlist t={Math.max(0, t(5))} /></div>}
          {vSt.o > 0.01 && j === 6 && <div style={{position: 'absolute', inset: 0, opacity: vSt.o, transform: `scale(${vSt.sc})`}}><StatsPage t={Math.max(0, t(6))} lang="Korean" flag="kr" /></div>}
          {vPk.o > 0.01 && j >= 7 && <div style={{position: 'absolute', inset: 0, opacity: vPk.o, transform: `scale(${vPk.sc})`}}><PickerPage t={Math.max(0, t(7))} langs={PT} /></div>}
        </div>
      </div>

      {/* hero pill (the reaction itself) */}
      {f >= HK0 + 6 * HKSTEP && (
        <div style={{position: 'absolute', left: heroX, top: heroY, width: PILL.w, height: PILL.h, borderRadius: 44, borderBottomLeftRadius: 10, background: INK, color: CREAM, fontFamily: SORA, fontWeight: 800, fontSize: 54, letterSpacing: '-0.04em', display: 'flex', alignItems: 'center', justifyContent: 'center', transformOrigin: '0 0', transform: `scale(${heroSc * (f < HK_MORPH ? Math.min(1.02, heroIn) : 1)})`, opacity: Math.min(1, heroIn * 1.5), paddingBottom: 4, boxSizing: 'border-box'}}>Daebak</div>
      )}
      {/* ending: the comment thread */}
      {e >= 0 && (
        <>
          <Avatar x={60} y={606} d={84} letter="M" s={Math.min(1, c1)} />
          <Bubble x={168} y={598} text="Daebak." size={56} o={Math.min(1, c1 * 1.5)} ox={(1 - Math.min(1, c1)) * -30} s={Math.min(1.03, c1)} />
          <Avatar x={60} y={756} d={84} letter="J" dark s={Math.min(1, c2)} />
          <Bubble x={168} y={748} text="ok, how do you know that?" size={50} o={Math.min(1, c2 * 1.5)} ox={(1 - Math.min(1, c2)) * -30} s={Math.min(1.03, c2)} />
          <Avatar x={60} y={906} d={84} letter="A" s={Math.min(1, c3)} />
          <Bubble x={168} y={884} text="Get Sprind." size={104} dark o={Math.min(1, c3 * 1.5)} ox={(1 - Math.min(1, c3)) * -30} s={Math.min(1.03, c3)} />
          <div style={{position: 'absolute', left: 101, top: 996, width: 4, height: 128 * Math.min(1, c4), background: INK, opacity: 0.5, borderRadius: 2}} />
          <Avatar x={150} y={1086} d={72} letter="S" dark s={Math.min(1, c4)} />
          <Bubble x={246} y={1074} text="Start now." size={60} o={Math.min(1, c4 * 1.5)} ox={(1 - Math.min(1, c4)) * -30} s={Math.min(1.03, c4)} />
          <Img src={staticFile('app-icon.png')} style={{position: 'absolute', left: 540 - 95, top: 1214, width: 190, height: 190, borderRadius: 44, opacity: Math.min(1, icon * 1.5), transform: `scale(${Math.min(1.05, icon)})`, boxShadow: '0 20px 50px rgba(13,11,10,0.3)'}} />
          <Img src={staticFile('app-store-badge.png')} style={{position: 'absolute', left: 540 - 188, top: 1424, height: 100, opacity: Math.min(1, bd * 1.4), transform: `scale(${Math.min(1, bd)})`}} />
        </>
      )}
    </AbsoluteFill>
  );
};

export const DaebakVideo: React.FC = () => {
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
