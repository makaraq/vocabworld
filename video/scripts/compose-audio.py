"""Composes the launch film's score and interface sounds from scratch.

Everything is synthesised here with numpy (no samples, no third-party
music), so the film carries no usage-rights questions. Deterministic: a
fixed seed drives every noise source, so re-running gives the same files.

The score runs at 120 BPM, so a beat is exactly 15 frames of the 30fps film
and the cuts land on it (src/timeline.ts):
  0.0–2.0s   the hook: plucks and hats rising under the flipping "hello"s
  2.0s       the drop, as "bonjour" lands
  2.0–27.0s  the groove under the app
  27.0s      the end card: drums out, a resolving chord and bells

Writes public/audio/ (MP3, 320 kbps; needs ffmpeg):
  sprind-theme.mp3   30s, D major
  sfx-tick.mp3       a short tick for each word the hook flips to
  sfx-hit.mp3        the landing hit under "bonjour"
  sfx-tap.mp3        a soft glass tap
  sfx-select.mp3     a two-note chime
  sfx-sweep.mp3      an airy swell
  sfx-shimmer.mp3    a high shimmer

Run: python3 scripts/compose-audio.py   (needs numpy)
"""

import os
import shutil
import subprocess
import wave

import numpy as np

SR = 44100
BPM = 120
BEAT = 60 / BPM
LENGTH = 30.0
DROP = 2.0  # "bonjour" lands (frame 60)
CLOSE = 27.0  # the end card (frame 810)
rng = np.random.default_rng(20261014)

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "audio")
os.makedirs(OUT, exist_ok=True)


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def env_adsr(n, attack, release, sustain_level=1.0):
    """Linear attack, flat, cosine release; lengths in seconds."""
    e = np.full(n, sustain_level)
    a = min(n, int(attack * SR))
    r = min(n - a, int(release * SR))
    if a:
        e[:a] = np.linspace(0, sustain_level, a)
    if r:
        e[n - r:] *= 0.5 * (1 + np.cos(np.linspace(0, np.pi, r)))
    return e


def place(buf, sig, start_s, pan=0.0):
    """Mix a mono signal into a stereo buffer at a time, equal-power pan."""
    i = int(start_s * SR)
    if i >= buf.shape[1]:
        return
    sig = sig[: buf.shape[1] - i]
    left = np.cos((pan + 1) * np.pi / 4)
    right = np.sin((pan + 1) * np.pi / 4)
    buf[0, i:i + len(sig)] += sig * left
    buf[1, i:i + len(sig)] += sig * right


def write_audio(name, stereo, peak=0.89):
    """Write <name>.mp3 (320 kbps, via ffmpeg) into public/audio."""
    stereo = stereo / max(1e-9, np.max(np.abs(stereo))) * peak
    data = (np.clip(stereo.T, -1, 1) * 32767).astype("<i2")
    wav = os.path.join(OUT, f"{name}.wav")
    with wave.open(wav, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise SystemExit("ffmpeg is needed to encode the MP3s")
    subprocess.run(
        [ffmpeg, "-y", "-loglevel", "error", "-i", wav, "-codec:a", "libmp3lame", "-b:a", "320k", os.path.join(OUT, f"{name}.mp3")],
        check=True,
    )
    os.remove(wav)
    print("wrote", f"{name}.mp3", f"{stereo.shape[1] / SR:.2f}s")


def reverb(stereo, seconds=2.6, mix=0.32, seed=7):
    """Convolve with decaying stereo noise: a soft, wide room."""
    r = np.random.default_rng(seed)
    n = int(seconds * SR)
    t = np.arange(n) / SR
    decay = np.exp(-t * 3.2 / seconds * 2.2)
    out = np.zeros((2, stereo.shape[1] + n))
    for ch in range(2):
        ir = r.standard_normal(n)
        spec = np.fft.rfft(ir)
        f = np.fft.rfftfreq(n, 1 / SR)
        ir = np.fft.irfft(spec / np.sqrt(1 + (f / 2400) ** 2), n) * decay  # a warm room, not a hiss
        ir[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))  # pre-delay softness
        ir /= np.sqrt(np.sum(ir ** 2))
        size = 1 << int(np.ceil(np.log2(stereo.shape[1] + n)))
        wet = np.fft.irfft(np.fft.rfft(stereo[ch], size) * np.fft.rfft(ir, size), size)
        out[ch, : stereo.shape[1] + n] = wet[: stereo.shape[1] + n]
    dry = np.zeros_like(out)
    dry[:, : stereo.shape[1]] = stereo
    return dry * (1 - mix) + out * mix


# ── Voices ────────────────────────────────────────────────────────────

def pad_chord(notes, dur, bright_from, bright_to, attack=1.4, release=1.6):
    """Detuned band-limited saws whose upper harmonics open over the chord."""
    n = int((dur + release) * SR)
    t = np.arange(n) / SR
    bright = np.linspace(bright_from, bright_to, n)
    sig = np.zeros(n)
    for m in notes:
        f0 = hz(m)
        for cents in (-9, -3, 4, 10):
            f = f0 * 2 ** (cents / 1200)
            phase = rng.uniform(0, 2 * np.pi)
            for k in range(1, 14):
                if f * k > 9000:
                    break
                cutoff = f0 * (1.5 + 10 * bright)
                amp = (1 / k) / np.sqrt(1 + (f * k / cutoff) ** 4)
                sig += amp * np.sin(2 * np.pi * f * k * t + phase * k)
    sig *= env_adsr(n, attack, release + 0.4)
    # slow breathing
    sig *= 0.85 + 0.15 * np.sin(2 * np.pi * 0.18 * t)
    return sig / (len(notes) * 4)


_pluck_cache = {}


def pluck(m, dur=0.6):
    if m in _pluck_cache:
        return _pluck_cache[m]
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = hz(m)
    sig = np.zeros(n)
    for k in range(1, 8):
        sig += (1 / k ** 1.4) * np.sin(2 * np.pi * f * k * t) * np.exp(-t * (5 + 3.5 * k))
    sig *= np.minimum(1, t / 0.003)
    _pluck_cache[m] = sig
    return sig


def bass(m, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = hz(m)
    sig = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t + 0.4)
    sig = np.tanh(1.4 * sig) * env_adsr(n, 0.01, min(0.25, dur * 0.4))
    return sig * np.exp(-t * 0.8)


def kick():
    n = int(0.42 * SR)
    t = np.arange(n) / SR
    freq = 44 + 80 * np.exp(-t * 28)
    phase = 2 * np.pi * np.cumsum(freq) / SR
    body = np.sin(phase) * np.exp(-t * 9)
    click = rng.standard_normal(n) * np.exp(-t * 400) * 0.08
    return np.tanh(1.6 * (body + click))


def hat(open_=False):
    n = int((0.22 if open_ else 0.06) * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    noise = np.diff(np.concatenate([[0], noise]))  # tilt toward the highs
    return noise * np.exp(-t * (22 if open_ else 80)) * 0.08


def rim():
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    tone = np.sin(2 * np.pi * 1650 * t) * np.exp(-t * 60)
    noise = np.diff(np.concatenate([[0], rng.standard_normal(n)])) * np.exp(-t * 45) * 0.25
    return (tone * 0.5 + noise) * 0.35


def bell(m, dur=2.4):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = hz(m)
    sig = np.zeros(n)
    for ratio, amp, decay in ((1, 1, 1.4), (2.0, 0.45, 2.2), (2.76, 0.28, 3.0), (5.4, 0.12, 5.0)):
        sig += amp * np.sin(2 * np.pi * f * ratio * t) * np.exp(-t * decay)
    return sig * np.minimum(1, t / 0.004)


def noise_swell(dur, rise=True):
    """Airy noise whose brightness and level swell up (or fall away)."""
    n = int(dur * SR)
    x = rng.standard_normal(n)
    out = np.zeros(n)
    y = 0.0
    coeff = np.linspace(0.008, 0.12, n) if rise else np.linspace(0.12, 0.008, n)
    for i in range(n):  # one-pole low-pass with a moving corner
        y += coeff[i] * (x[i] - y)
        out[i] = y
    shape = np.sin(np.linspace(0, np.pi, n)) ** 1.5
    return out * shape


# ── The score ─────────────────────────────────────────────────────────

def compose():
    N = int(LENGTH * SR)
    music = np.zeros((2, N))
    arp_bus = np.zeros((2, N))

    # D major, one bar per chord at 120 BPM: Dmaj9, Bm9, Gmaj9, A6sus.
    chords = [
        ([50, 57, 61, 64, 66], 38),  # Dmaj9   (bass D2)
        ([47, 54, 57, 61, 62], 35),  # Bm9     (B1)
        ([43, 50, 54, 57, 59], 31),  # Gmaj9   (G1)
        ([45, 52, 54, 59, 61], 33),  # A6sus   (A1)
    ]
    bar = 4 * BEAT  # 2.0s

    # Under the hook: a filtered Dmaj9 swelling into the drop.
    place(music, 0.4 * pad_chord(chords[0][0], DROP + 0.2, 0.1, 0.55, attack=0.4, release=0.6), 0.0)

    # Pads from the drop to the close, opening up as the film goes.
    t = DROP
    i = 0
    while t < CLOSE - 0.01:
        notes, _ = chords[i % 4]
        progress = (t - DROP) / (CLOSE - DROP)
        place(music, 0.5 * pad_chord(notes, bar + 0.25, 0.3 + 0.5 * progress, 0.35 + 0.55 * progress, attack=0.25, release=1.0), t)
        t += bar
        i += 1

    # The close: drums out, Gmaj9 then a long Dmaj9 with bells.
    place(music, 0.55 * pad_chord([43, 50, 54, 57, 62, 66], 1.0, 0.8, 0.6, attack=0.05, release=0.8), CLOSE)
    place(music, 0.6 * pad_chord([38, 50, 57, 61, 64, 69], 2.0, 0.7, 0.35, attack=0.5, release=1.6), CLOSE + 1.0)
    for m, d in ((74, 0.0), (78, 0.08), (81, 0.16), (85, 0.24)):
        place(music, 0.16 * bell(m, 3.0), CLOSE + d, pan=(m - 79) / 10)
    for m, d in ((69, 0.0), (73, 0.1), (76, 0.2), (81, 0.3)):
        place(music, 0.12 * bell(m, 2.6), CLOSE + 1.0 + d, pan=(m - 75) / 12)

    # The hook: 16th-note plucks and hats climbing toward the drop.
    steps = int(DROP / (BEAT / 4))
    for s16 in range(steps):
        t = s16 * BEAT / 4
        rise = (s16 + 1) / steps
        note = [62, 66, 69, 73][s16 % 4] + (12 if s16 >= steps // 2 else 0)
        place(arp_bus, (0.18 + 0.32 * rise) * pluck(note), t, pan=0.4 * np.sin(s16 * 1.1))
        if s16 % 2 == 1:
            place(music, 0.6 * rise * hat(), t, pan=-0.3)

    # The groove: kick on every beat (soft), rim on 2 and 4, 8th-note hats,
    # bass on the root, 16th-note arpeggio over the chord.
    beat_index = 0
    t = DROP
    while t < CLOSE - 0.01:
        bar_pos = beat_index % 4
        notes, root = chords[int((t - DROP) // bar) % 4]
        place(music, (0.42 if bar_pos in (0, 2) else 0.3) * kick(), t)
        if bar_pos in (1, 3):
            place(music, 0.45 * rim(), t, pan=0.15)
        for e in range(2):
            place(music, (0.55 if e else 0.35) * hat(open_=(e == 1 and bar_pos == 3)), t + e * BEAT / 2, pan=-0.3)
        place(music, 0.3 * bass(root, BEAT * 0.9), t)
        if bar_pos == 3:
            place(music, 0.22 * bass(root + 12, BEAT * 0.4), t + BEAT / 2)

        pattern = [0, 2, 3, 1, 4, 2, 3, 1]
        lift = 12 if t >= CLOSE - 4 * BEAT * 2 else 0
        for s16 in range(4):
            note = notes[pattern[(beat_index * 4 + s16) % 8] % len(notes)] + 12 + lift
            vel = 0.5 if s16 == 0 else 0.32
            place(arp_bus, vel * pluck(note), t + s16 * BEAT / 4, pan=0.35 * np.sin(beat_index * 1.3 + s16))

        t += BEAT
        beat_index += 1

    # The drop itself: a deep thump and a low D under "bonjour".
    place(music, 0.7 * kick(), DROP)
    place(music, 0.45 * bass(38, BEAT * 2), DROP)

    # Ping-pong delay on the plucks (dotted 8th).
    delay = int(0.75 * BEAT * SR)
    echoes = arp_bus.copy()
    gain = 0.4
    for k in range(1, 5):
        shifted = np.zeros_like(arp_bus)
        shifted[:, delay * k:] = arp_bus[:, : N - delay * k]
        if k % 2:
            shifted = shifted[::-1]
        echoes += shifted * gain ** k
    music += 0.9 * echoes

    # Air: a riser into the drop, and one into the close.
    place(music, 0.55 * noise_swell(DROP), 0.0)
    place(music, 0.8 * noise_swell(2.2), CLOSE - 2.0)

    music = reverb(music, seconds=2.4, mix=0.28)[:, :N]

    music = np.tanh(1.15 * music / np.max(np.abs(music))) / np.tanh(1.15)
    tail = int(1.5 * SR)
    music[:, -tail:] *= np.linspace(1, 0, tail) ** 1.5
    write_audio("sprind-theme", music)


def sfx():
    # Tick: a short bright pluck for each word the hook flips to.
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    tick = (np.sin(2 * np.pi * 1760 * t) * np.exp(-t * 70)
            + 0.4 * np.sin(2 * np.pi * 2640 * t) * np.exp(-t * 110)) * np.minimum(1, t / 0.002)
    write_audio("sfx-tick", np.vstack([tick, tick]), peak=0.6)

    # Hit: a low thump with a bright transient and a short bloom of air.
    n = int(0.9 * SR)
    t = np.arange(n) / SR
    freq = 50 + 110 * np.exp(-t * 22)
    body = np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.exp(-t * 6)
    snap = np.diff(np.concatenate([[0], rng.standard_normal(n)])) * np.exp(-t * 60) * 0.25
    hit = np.tanh(1.8 * (body + snap))
    write_audio("sfx-hit", reverb(np.vstack([hit, hit]), seconds=1.2, mix=0.25), peak=0.85)

    # Tap: a short, soft glassy tick.
    n = int(0.18 * SR)
    t = np.arange(n) / SR
    tick = (np.sin(2 * np.pi * 2100 * t) * np.exp(-t * 90) * 0.6
            + np.sin(2 * np.pi * 3300 * t) * np.exp(-t * 140) * 0.25
            + np.diff(np.concatenate([[0], rng.standard_normal(n)])) * np.exp(-t * 400) * 0.08)
    write_audio("sfx-tap", reverb(np.vstack([tick, tick]), seconds=0.6, mix=0.18), peak=0.7)

    # Select: two-note chime, a fifth apart.
    n = int(1.6 * SR)
    chime = np.zeros(n)
    chime[: int(1.2 * SR)] += 0.6 * bell(88, 1.2)
    b = bell(95, 1.4)
    chime[int(0.07 * SR): int(0.07 * SR) + len(b)] += 0.45 * b[: n - int(0.07 * SR)]
    write_audio("sfx-select", reverb(np.vstack([chime, chime]), seconds=1.4, mix=0.3), peak=0.6)

    # Sweep: airy noise swell.
    swell = noise_swell(0.9)
    write_audio("sfx-sweep", reverb(np.vstack([swell, np.roll(swell, 90)]), seconds=1.2, mix=0.35), peak=0.6)

    # Shimmer: a scatter of high partials.
    n = int(2.6 * SR)
    shimmer = np.zeros(n)
    for k in range(14):
        start = int(rng.uniform(0, 0.45) * SR)
        m = rng.choice([86, 90, 93, 97, 98, 102])
        b = bell(m, 1.8) * rng.uniform(0.15, 0.35)
        shimmer[start: start + len(b)] += b[: n - start]
    write_audio("sfx-shimmer", reverb(np.vstack([shimmer, np.roll(shimmer, 200)]), seconds=1.8, mix=0.4), peak=0.6)


if __name__ == "__main__":
    compose()
    sfx()
