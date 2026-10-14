"""Composes the score and street sounds for "The Last Word" from scratch.

Synthesised with numpy (no samples, no third-party music), reusing the
voices of compose-audio.py. Deterministic: fixed seeds throughout.

120 BPM, F major, so a beat is 15 frames of the 30fps film and every cut,
footstep and subtitle word lands on one (src/last-word/timeline.ts):
  0.0–2.0s    "Lost?": a ticking pluck over an unresolved chord
  2.0s        the signpost settles; the harmony lands on F
  2.0–6.0s    the phone: a soft pad, bells as the card plays (4.0s, 4.4s)
  6.0–12.0s   the walk: musette lead, walking bass, brushes; up at 9.0s
  12.0–16.0s  the café: the lead plays the owner's words, one per beat
  16.0–17.5s  the door
  17.5–19.5s  the end card: a resolving chord and bells

Writes public/audio/ (MP3, 320 kbps; needs ffmpeg):
  last-word-score.mp3   19.5s
  lw-step-a.mp3         a footstep on cobbles, and a second foot
  lw-step-b.mp3
  lw-church-bell.mp3    a big bell, for the view over the river
  lw-clink.mp3          a cup set down on its saucer
  lw-door-bell.mp3      the little bell over a Paris door

Run: python3 scripts/compose-last-word.py   (needs numpy)
"""

import importlib.util
import os
import sys

import numpy as np

sys.dont_write_bytecode = True  # importing the sibling script leaves no __pycache__
_spec = importlib.util.spec_from_file_location("score", os.path.join(os.path.dirname(__file__), "compose-audio.py"))
S = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(S)

SR, BEAT, hz, place, env_adsr = S.SR, S.BEAT, S.hz, S.place, S.env_adsr
rng = np.random.default_rng(20261015)
LENGTH = 19.5
LAND = 2.0
WALK = 6.0
REVEAL = 9.0
CAFE = 12.0
DOOR = 16.0
END = 17.5


def band(x, lo, hi):
    """Band-pass by FFT mask with soft edges."""
    spec = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    mask = 1 / np.sqrt(1 + (lo / np.maximum(f, 1)) ** 4) / np.sqrt(1 + (f / hi) ** 4)
    return np.fft.irfft(spec * mask, len(x))


# ── Voices ────────────────────────────────────────────────────────────

def musette(m, dur, vel=1.0):
    """Three accordion reeds, the outer two detuned: the musette shimmer."""
    n = int((dur + 0.14) * SR)
    t = np.arange(n) / SR
    f = hz(m)
    vib = 1 + 0.0035 * np.sin(2 * np.pi * 5.4 * t) * np.minimum(1, t / 0.3)
    sig = np.zeros(n)
    for det in (-0.0042, 0.0, 0.0042):
        ph = 2 * np.pi * f * (1 + det) * np.cumsum(vib) / SR
        for k, a in ((1, 1.0), (2, 0.55), (3, 0.42), (4, 0.22), (5, 0.18), (6, 0.08), (7, 0.07)):
            if f * k > 8000:
                break
            sig += a * np.sin(k * ph + det * 300 * k)
    return vel * sig * env_adsr(n, 0.03, 0.14) / 5


def upright(m, dur=0.45):
    """A pizzicato double bass: a thumb on the string and a quick bloom."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = hz(m)
    sig = np.sin(2 * np.pi * f * t) + 0.45 * np.sin(4 * np.pi * f * t) * np.exp(-t * 9) + 0.2 * np.sin(6 * np.pi * f * t) * np.exp(-t * 14)
    thump = rng.standard_normal(n) * np.exp(-t * 300) * 0.15
    return np.tanh(1.3 * (sig * np.exp(-t * 5.5) + thump)) * np.minimum(1, t / 0.004)


def strum(notes, short=True):
    """La pompe: a quick down-strum of plucked strings, damped."""
    n = int(0.5 * SR)
    out = np.zeros(n)
    for i, m in enumerate(notes):
        p = S.pluck(m, 0.5)  # cached by note: may be shorter than asked
        start = int(i * 0.009 * SR)
        seg = p[: n - start]
        out[start:start + len(seg)] += seg
    t = np.arange(n) / SR
    return out * (np.exp(-t * 16) if short else np.exp(-t * 4)) / len(notes)


def brush(dur=0.18):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = band(rng.standard_normal(n), 2500, 9000)
    return x * np.sin(np.pi * np.minimum(1, t / dur)) ** 0.6 * 0.5


# Chords: (voicing, bass line for the bar's beats)
FMAJ7 = [53, 57, 60, 64]
DM7 = [50, 53, 57, 60]
GM7 = [55, 58, 62, 65]
C7 = [52, 55, 58, 60]
BBMAJ7 = [50, 53, 57, 58]

# One chord per beat from the walk on, with the bass note under it.
HARMONY = (
    [(FMAJ7, b) for b in (41, 45, 48, 52)]
    + [(DM7, b) for b in (38, 41, 45, 48)]
    + [(GM7, 43), (GM7, 46), (C7, 36), (C7, 40)]
    + [(FMAJ7, b) for b in (41, 45, 48, 45)]
    + [(BBMAJ7, 46), (BBMAJ7, 50), (C7, 48), (C7, 40)]
    + [(FMAJ7, b) for b in (41, 45, 48)]
)

# The tune, in beats from the walk (6.0s): (beat, midi, length in beats).
MELODY = [
    (0, 72, 1), (1, 69, 0.5), (1.5, 70, 0.5), (2, 72, 1), (3, 77, 1),
    (4, 76, 1), (5, 74, 0.5), (5.5, 72, 0.5),
    (6, 81, 1.5), (7.5, 79, 0.5),  # the view opens
    (8, 77, 0.5), (8.5, 74, 0.5), (9, 70, 1), (10, 76, 0.5), (10.5, 74, 0.5), (11, 72, 1),
    (12, 77, 1.5), (13.5, 76, 0.5),
    # "à · gauche, · puis · tout · droit." on 13.0, 13.5, 14.0, 14.5, 15.0s
    (14, 69, 0.5), (15, 72, 0.9), (16, 70, 0.7), (17, 74, 0.7), (18, 72, 1.6),
    (20, 69, 0.5), (20.5, 72, 0.5), (21, 77, 0.5), (21.5, 76, 0.5), (22, 79, 1),
]


def compose():
    N = int(LENGTH * SR)
    music = np.zeros((2, N))
    lead = np.zeros((2, N))

    # "Lost?": tick-tock plucks over an unresolved chord, quickening.
    place(music, 0.35 * S.pad_chord([48, 55, 58, 62, 65], LAND + 0.1, 0.1, 0.4, attack=0.3, release=0.5), 0.0)
    for k in range(8):
        t = k * BEAT / 2
        place(music, (0.25 + 0.05 * k) * S.pluck(79 if k % 2 == 0 else 74, 0.4), t, pan=0.3 if k % 2 else -0.3)
    for k, m in enumerate((72, 74, 76, 79)):
        place(music, 0.3 * S.pluck(m, 0.4), 1.5 + k * BEAT / 8, pan=0.2)
    place(music, 0.5 * S.noise_swell(LAND), 0.0)

    # Found: F lands with the signpost; the phone's soft bed.
    place(music, 0.6 * upright(29 + 12, 1.2), LAND)
    place(music, 0.45 * S.pad_chord(FMAJ7 + [67], 2.1, 0.3, 0.45, attack=0.15, release=0.6), LAND)
    place(music, 0.42 * S.pad_chord(DM7 + [64], 2.1, 0.35, 0.5, attack=0.3, release=0.8), LAND + 2.0)
    for k in range(16):
        t = LAND + k * BEAT / 2
        notes = FMAJ7 if t < LAND + 2 else DM7
        place(music, 0.12 * S.pluck(notes[k % 4] + 24, 0.4), t, pan=0.4 * np.sin(k))
    # The card plays: "gau-che", then "left".
    for t, m in ((4.0, 81), (4.2, 77), (4.4, 84)):
        place(music, 0.22 * S.bell(m, 1.6), t, pan=0.1)

    # The walk, the café and the door: bass, pompe, brushes, the lead.
    for b, (chord, root) in enumerate(HARMONY):
        t = WALK + b * BEAT
        place(music, 0.5 * upright(root), t)
        accent = b % 2 == 1
        place(music, (0.55 if accent else 0.3) * strum([m + 12 for m in chord]), t + 0.01, pan=-0.25)
        if accent:
            place(music, 0.35 * brush(), t, pan=0.25)
        if b % 4 == 0:
            place(music, 0.22 * S.kick(), t)
    for beat, m, length in MELODY:
        vel = 0.8 if WALK + beat * BEAT >= CAFE else 1.0
        place(lead, vel * musette(m, length * BEAT), WALK + beat * BEAT, pan=0.1)
    # The view: the pad opens under the held note.
    place(music, 0.4 * S.pad_chord(DM7 + [69], 1.6, 0.4, 0.8, attack=0.05, release=0.9), REVEAL)
    place(music, 0.6 * S.noise_swell(1.0), REVEAL - 1.0)

    # Café murmur, under the owner's words.
    n = int((DOOR - CAFE) * SR)
    t = np.arange(n) / SR
    murmur = band(rng.standard_normal(n), 180, 900) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.7 * t) * np.sin(2 * np.pi * 1.9 * t))
    murmur *= np.minimum(1, t / 0.3) * np.minimum(1, (t[-1] - t) / 0.4)
    place(music, 0.25 * murmur, CAFE, pan=-0.3)

    # The end card: drums out, a resolving F with bells.
    place(music, 0.6 * S.pad_chord([41, 53, 57, 60, 64, 67], 2.0, 0.6, 0.35, attack=0.08, release=1.4), END)
    place(music, 0.55 * upright(41, 1.6), END)
    place(lead, 0.9 * musette(81, 1.6), END, pan=0.1)
    for k, m in enumerate((77, 81, 84, 89)):
        place(music, 0.16 * S.bell(m, 2.2), END + 0.1 + k * 0.09, pan=(m - 83) / 10)

    music += lead * 0.9
    music = S.reverb(music, seconds=2.0, mix=0.24)[:, :N]
    music = np.tanh(1.1 * music / np.max(np.abs(music))) / np.tanh(1.1)
    tail = int(1.2 * SR)
    music[:, -tail:] *= np.linspace(1, 0, tail) ** 1.5
    S.write_audio("last-word-score", music)


def sfx():
    # Footsteps: a heel on stone, the scuff of the sole, a soft thud.
    for name, pitch, seed in (("lw-step-a", 1.0, 1), ("lw-step-b", 0.9, 2)):
        r = np.random.default_rng(seed)
        n = int(0.26 * SR)
        t = np.arange(n) / SR
        heel = band(r.standard_normal(n), 1400 * pitch, 5200) * np.exp(-t * 95) * 0.9
        scuff = np.zeros(n)
        k = int(0.035 * SR)
        scuff[k:] = band(r.standard_normal(n - k), 350 * pitch, 1600) * np.exp(-t[: n - k] * 30) * 0.45
        thud = np.sin(2 * np.pi * 85 * pitch * t) * np.exp(-t * 32) * 0.6
        step = heel + scuff + thud
        S.write_audio(name, S.reverb(np.vstack([step, step]), seconds=0.5, mix=0.12), peak=0.75)

    # A church bell in F: hum, prime, minor third, fifth, nominal, and up.
    n = int(5.5 * SR)
    t = np.arange(n) / SR
    f = hz(53)
    bell = np.zeros(n)
    for ratio, amp, decay in ((0.5, 0.7, 0.45), (1.0, 1.0, 0.8), (1.19, 0.6, 1.1), (1.5, 0.35, 1.3), (2.0, 0.55, 1.5), (2.52, 0.25, 2.2), (3.0, 0.18, 2.8), (4.2, 0.1, 3.6)):
        bell += amp * np.sin(2 * np.pi * f * ratio * t + ratio) * np.exp(-t * decay)
    strike = band(rng.standard_normal(n), 800, 4000) * np.exp(-t * 60) * 0.3
    bell = (bell + strike) * np.minimum(1, t / 0.003)
    S.write_audio("lw-church-bell", S.reverb(np.vstack([bell, np.roll(bell, 300)]), seconds=3.5, mix=0.4), peak=0.8)

    # A cup set down on its saucer: two china clicks.
    n = int(0.6 * SR)
    t = np.arange(n) / SR

    def china(scale):
        s = np.zeros(n)
        for fr, a, d in ((2150, 1.0, 38), (3420, 0.6, 50), (5230, 0.4, 70), (6900, 0.25, 90)):
            s += a * np.sin(2 * np.pi * fr * scale * t) * np.exp(-t * d)
        return s * np.minimum(1, t / 0.001)

    clink = china(1.0)
    k = int(0.07 * SR)
    clink[k:] += 0.45 * china(1.04)[: n - k]
    S.write_audio("lw-clink", S.reverb(np.vstack([clink, clink]), seconds=0.9, mix=0.25), peak=0.6)

    # The door bell: a small brass bell, shaken a few times as the door opens.
    n = int(1.6 * SR)
    t = np.arange(n) / SR
    door = np.zeros(n)
    for start, amp, detune in ((0.0, 1.0, 1.0), (0.09, 0.7, 1.012), (0.17, 0.5, 0.994), (0.3, 0.32, 1.006)):
        k = int(start * SR)
        tt = t[: n - k]
        s = np.zeros(n - k)
        for ratio, a, d in ((1.0, 1.0, 5.0), (2.32, 0.5, 8.0), (4.1, 0.3, 12.0)):
            s += a * np.sin(2 * np.pi * 2350 * detune * ratio * tt) * np.exp(-tt * d)
        door[k:] += amp * s * np.minimum(1, tt / 0.001)
    S.write_audio("lw-door-bell", S.reverb(np.vstack([door, np.roll(door, 120)]), seconds=1.2, mix=0.3), peak=0.55)


if __name__ == "__main__":
    compose()
    sfx()
