import SwiftUI

// An avatar wearing its rank's border: the native twin of
// components/leveling/level-avatar.tsx and app/leveling.css. Every length is a
// fraction of the avatar's diameter `d`, and every animation is a function of
// the time `t`, so one TimelineView drives the whole border at the screen's
// full refresh rate (120 Hz on ProMotion iPhones; the web view stops at 60)
// and holds it still when `animated` is false.

enum BorderStyle: String {
    case tourist, phrasebook, backpacker, conversationalist, wordsmith, interpreter
    case storyteller, polyglot, linguist, lexicon, babel, ages, omniglot
}

// ── Time ─────────────────────────────────────────────────────────────────────

/// Where `t` is in a cycle of `period` seconds, 0..<1.
func cyclePosition(_ t: Double, _ period: Double) -> Double {
    let p = (t / period).truncatingRemainder(dividingBy: 1)
    return p < 0 ? p + 1 : p
}

/// A steady turn, one full circle every `period` seconds.
private func spin(_ t: Double, _ period: Double) -> Angle {
    .degrees(cyclePosition(t, period) * 360)
}

/// 0 → 1 → 0 over `period`, eased like the CSS keyframes it replaces.
private func wave(_ t: Double, _ period: Double, delay: Double = 0) -> Double {
    0.5 - 0.5 * cos(cyclePosition(t - delay, period) * 2 * .pi)
}

// ── The avatar ───────────────────────────────────────────────────────────────

struct LevelAvatarView: View {
    let border: BorderStyle
    let level: Int
    let color: Color
    let accent: Color
    let size: CGFloat
    var image: UIImage? = nil
    var initials: String = ""
    var showLevel = true
    var animated = true

    var body: some View {
        TimelineView(.animation(minimumInterval: nil, paused: !animated)) { context in
            AvatarLayers(
                border: border,
                level: level,
                color: color,
                accent: accent,
                d: size,
                image: image,
                initials: initials,
                showLevel: showLevel,
                t: context.date.timeIntervalSinceReferenceDate
            )
        }
        .frame(width: size, height: size)
    }
}

private struct AvatarLayers: View {
    let border: BorderStyle
    let level: Int
    let color: Color
    let accent: Color
    let d: CGFloat
    let image: UIImage?
    let initials: String
    let showLevel: Bool
    let t: Double

    var body: some View {
        ZStack {
            BorderBack(border: border, color: color, d: d, t: t)
            face
            RingLayers(border: border, d: d, t: t)
            BorderFront(border: border, d: d, t: t)
            if showLevel { pill }
            if border == .omniglot { Crown(d: d, t: t) }
        }
        .frame(width: d, height: d)
    }

    private var face: some View {
        ZStack {
            LinearGradient(colors: [Color(hex: "#7c3aed"), Color(hex: "#db2777")],
                           startPoint: .topLeading, endPoint: .bottomTrailing)
            if let image {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
                    .frame(width: d, height: d)
            } else {
                Text(initials)
                    .font(.system(size: d * 0.32, weight: .bold))
                    .foregroundColor(.white)
            }
        }
        .frame(width: d, height: d)
        .clipShape(Circle())
        .overlay(Circle().stroke(Color.black.opacity(0.25), lineWidth: d * 0.02))
    }

    private var pill: some View {
        Text("\(level)")
            .font(.system(size: d * 0.14, weight: .heavy).monospacedDigit())
            .foregroundColor(.white)
            .shadow(color: .black.opacity(0.55), radius: 1, x: 0, y: 1)
            .padding(.horizontal, d * 0.07)
            .frame(minWidth: d * 0.36, minHeight: d * 0.22, maxHeight: d * 0.22)
            .background(
                Capsule().fill(LinearGradient(colors: [color, accent], startPoint: .topLeading, endPoint: .bottomTrailing))
            )
            .overlay(Capsule().strokeBorder(Color.white.opacity(0.55), lineWidth: max(0.5, d * 0.012)))
            .shadow(color: .black.opacity(0.45), radius: d * 0.03, x: 0, y: d * 0.02)
            .offset(y: d * 0.51)
    }
}

// ── The rim ──────────────────────────────────────────────────────────────────

private struct RingSpec {
    /// Width of the band, as a fraction of `d`. The band sits just outside the face.
    var width: CGFloat
    var colors: [String]
    /// Seconds per turn; 0 holds it still.
    var period: Double
    /// A thin second rim further out, turning the other way.
    var outerOutset: CGFloat = 0
    var outerWidth: CGFloat = 0
    var outerColors: [String] = []
    var outerPeriod: Double = 0
    var glow: Color? = nil
}

private let goldRim2 = ["#fffbeb", "#fbbf24", "#fffbeb", "#fbbf24", "#fffbeb"]
private let rainbow = ["#f472b6", "#fb923c", "#facc15", "#4ade80", "#22d3ee", "#818cf8", "#e879f9", "#f472b6"]

private func ringSpec(_ border: BorderStyle) -> RingSpec {
    switch border {
    case .tourist:
        return RingSpec(width: 0.045, colors: [], period: 0)
    case .phrasebook:
        return RingSpec(width: 0.07, colors: ["#7c2d12", "#f59e0b", "#fde68a", "#b45309", "#7c2d12", "#d97706", "#fcd34d", "#92400e", "#7c2d12"], period: 9)
    case .backpacker:
        return RingSpec(width: 0.075, colors: ["#6b7280", "#f9fafb", "#9ca3af", "#e5e7eb", "#4b5563", "#f3f4f6", "#9ca3af", "#6b7280"], period: 7)
    case .conversationalist:
        return RingSpec(width: 0.08, colors: ["#92400e", "#facc15", "#fffbeb", "#f59e0b", "#92400e", "#fde047", "#fff7c2", "#d97706", "#92400e"], period: 5,
                        glow: Color(hex: "#facc15", opacity: 0.6))
    case .wordsmith:
        return RingSpec(width: 0.065, colors: ["#064e3b", "#34d399", "#d1fae5", "#059669", "#064e3b", "#6ee7b7", "#ecfdf5", "#047857", "#064e3b"], period: 6,
                        outerOutset: 0.14, outerWidth: 0.025, outerColors: ["#a7f3d0", "#059669", "#a7f3d0", "#059669", "#a7f3d0"], outerPeriod: 10)
    case .interpreter:
        return RingSpec(width: 0.07, colors: ["#1e3a8a", "#60a5fa", "#dbeafe", "#2563eb", "#1e3a8a", "#93c5fd", "#eff6ff", "#1d4ed8", "#1e3a8a"], period: 5)
    case .storyteller:
        return RingSpec(width: 0.075, colors: ["#4c1d95", "#c084fc", "#f5d0fe", "#7c3aed", "#4c1d95", "#e9d5ff", "#a855f7", "#4c1d95"], period: 6)
    case .polyglot:
        return RingSpec(width: 0.075, colors: ["#7f1d1d", "#f43f5e", "#fed7aa", "#e11d48", "#7f1d1d", "#fb923c", "#fef3c7", "#be123c", "#7f1d1d"], period: 2.6)
    case .linguist:
        return RingSpec(width: 0.075, colors: rainbow, period: 3)
    case .lexicon:
        return RingSpec(width: 0.07, colors: ["#0f766e", "#5eead4", "#ede9fe", "#a78bfa", "#0f766e", "#99f6e4", "#c4b5fd", "#0f766e"], period: 4)
    case .babel:
        return RingSpec(width: 0.07, colors: ["#312e81", "#a5b4fc", "#fbcfe8", "#6366f1", "#312e81", "#f472b6", "#e0e7ff", "#4338ca", "#312e81"], period: 4)
    case .ages:
        return RingSpec(width: 0.07, colors: ["#92400e", "#fde68a", "#fffbeb", "#f59e0b", "#92400e", "#fef3c7", "#fbbf24", "#92400e"], period: 4,
                        outerOutset: 0.13, outerWidth: 0.02, outerColors: goldRim2, outerPeriod: 8)
    case .omniglot:
        return RingSpec(width: 0.08, colors: ["#f472b6", "#fb923c", "#fde047", "#4ade80", "#22d3ee", "#818cf8", "#e879f9", "#f472b6"], period: 2.2,
                        outerOutset: 0.13, outerWidth: 0.02, outerColors: goldRim2, outerPeriod: 8)
    }
}

private struct RingLayers: View {
    let border: BorderStyle
    let d: CGFloat
    let t: Double

    var body: some View {
        let spec = ringSpec(border)
        ZStack {
            if spec.colors.isEmpty {
                Band(fill: AnyShapeStyle(Color.white.opacity(0.4)), width: spec.width * d, outset: spec.width * d, d: d)
            } else {
                Band(fill: AnyShapeStyle(conic(spec.colors)), width: spec.width * d, outset: spec.width * d, d: d)
                    .rotationEffect(spin(t, spec.period))
                    .shadow(color: spec.glow ?? .clear, radius: spec.glow == nil ? 0 : d * 0.04)
            }
            if !spec.outerColors.isEmpty {
                Band(fill: AnyShapeStyle(conic(spec.outerColors)), width: spec.outerWidth * d, outset: spec.outerOutset * d, d: d)
                    .rotationEffect(-spin(t, spec.outerPeriod))
            }
        }
    }
}

/// A conic gradient starting at 12 o'clock, like CSS `conic-gradient`.
private func conic(_ colors: [String]) -> AngularGradient {
    AngularGradient(gradient: Gradient(colors: colors.map { Color(hex: $0) }), center: .center, angle: .degrees(-90))
}

/// A band `width` wide whose outer edge is `outset` past the face's edge.
private struct Band: View {
    let fill: AnyShapeStyle
    let width: CGFloat
    let outset: CGFloat
    let d: CGFloat

    var body: some View {
        Circle()
            .strokeBorder(fill, lineWidth: width)
            .frame(width: d + 2 * outset, height: d + 2 * outset)
    }
}

// ── Behind the face ──────────────────────────────────────────────────────────

private struct BorderBack: View {
    let border: BorderStyle
    let color: Color
    let d: CGFloat
    let t: Double

    var body: some View {
        ZStack {
            switch border {
            case .wordsmith:
                Pulse(gradient: Gradient(colors: [color, color.opacity(0)]), size: d * 1.44, period: 2.6, t: t)
            case .storyteller:
                Pulse(gradient: Gradient(colors: [color, color.opacity(0)]), size: d * 1.44, period: 2.6, t: t)
                Shards(d: d, t: t)
            case .polyglot:
                Flames(d: d, t: t)
            case .linguist:
                Circle()
                    .fill(conic(rainbow))
                    .frame(width: d * 1.32, height: d * 1.32)
                    .blur(radius: d * 0.08)
                    .opacity(0.75)
                    .rotationEffect(-spin(t, 5))
            case .lexicon:
                Aurora(d: d, t: t)
            case .babel:
                Cosmos(d: d, t: t)
                PlanetOrbits(d: d, t: t, front: false)
            case .interpreter:
                DashedOrbit(d: d, t: t)
            case .ages:
                Rays(d: d, t: t, rainbow: false)
                Wings(d: d, t: t, top: -0.05)
            case .omniglot:
                Rays(d: d, t: t, rainbow: true)
                Pulse(gradient: Gradient(stops: [
                    .init(color: Color.white.opacity(0.95), location: 0),
                    .init(color: Color(hex: "#f472b6", opacity: 0.5), location: 0.6),
                    .init(color: Color(hex: "#f472b6", opacity: 0), location: 1),
                ]), size: d * 1.4, period: 1.8, t: t)
                Wings(d: d, t: t, top: 0.02)
            default:
                EmptyView()
            }
        }
    }
}

/// A soft disc breathing in and out.
private struct Pulse: View {
    let gradient: Gradient
    let size: CGFloat
    let period: Double
    let t: Double

    var body: some View {
        let w = wave(t, period)
        Circle()
            .fill(RadialGradient(gradient: gradient, center: .center, startRadius: 0, endRadius: size / 2))
            .frame(width: size, height: size)
            .scaleEffect(1 + 0.08 * w)
            .opacity(0.55 + 0.45 * w)
    }
}

/// Polyglot: a ring of fire, every flame flickering on its own beat.
private struct Flames: View {
    let d: CGFloat
    let t: Double

    private static let count = 14
    private static let gradient = Gradient(stops: [
        .init(color: Color(hex: "#fffbeb"), location: 0),
        .init(color: Color(hex: "#fde047"), location: 0.22),
        .init(color: Color(hex: "#fb923c"), location: 0.5),
        .init(color: Color(hex: "#e11d48"), location: 0.8),
        .init(color: Color(hex: "#e11d48", opacity: 0), location: 1),
    ])

    var body: some View {
        ZStack {
            ForEach(0..<Self.count, id: \.self) { i in
                let w = wave(t, 0.5 + Double(i) * 0.037, delay: -Double(i) * 0.11)
                FlameShape()
                    .fill(RadialGradient(gradient: Self.gradient, center: UnitPoint(x: 0.5, y: 0.85),
                                         startRadius: 0, endRadius: d * 0.24))
                    .frame(width: d * 0.15, height: d * 0.27)
                    .scaleEffect(x: 1 - 0.15 * w, y: 1 + 0.35 * w)
                    .opacity(0.9 + 0.1 * w)
                    .offset(y: -d * (0.56 + 0.04 * w))
                    .rotationEffect(.degrees(Double(i) * 360 / Double(Self.count)))
            }
        }
    }
}

private struct FlameShape: Shape {
    func path(in r: CGRect) -> Path {
        let w = r.width
        let h = r.height
        var p = Path()
        p.move(to: CGPoint(x: r.midX, y: r.minY))
        p.addCurve(to: CGPoint(x: r.maxX, y: r.minY + h * 0.68),
                   control1: CGPoint(x: r.midX + w * 0.3, y: r.minY + h * 0.22),
                   control2: CGPoint(x: r.maxX, y: r.minY + h * 0.42))
        p.addCurve(to: CGPoint(x: r.minX, y: r.minY + h * 0.68),
                   control1: CGPoint(x: r.maxX, y: r.maxY + h * 0.06),
                   control2: CGPoint(x: r.minX, y: r.maxY + h * 0.06))
        p.addCurve(to: CGPoint(x: r.midX, y: r.minY),
                   control1: CGPoint(x: r.minX, y: r.minY + h * 0.42),
                   control2: CGPoint(x: r.midX - w * 0.3, y: r.minY + h * 0.22))
        p.closeSubpath()
        return p
    }
}

/// Lexicon Lord: two veils of colour turning against each other.
private struct Aurora: View {
    let d: CGFloat
    let t: Double

    private static let first = Gradient(stops: [
        .init(color: Color(hex: "#2dd4bf", opacity: 0), location: 0),
        .init(color: Color(hex: "#2dd4bf", opacity: 0), location: 0.10),
        .init(color: Color(hex: "#2dd4bf"), location: 0.25),
        .init(color: Color(hex: "#2dd4bf", opacity: 0), location: 0.40),
        .init(color: Color(hex: "#a78bfa", opacity: 0), location: 0.60),
        .init(color: Color(hex: "#a78bfa"), location: 0.75),
        .init(color: Color(hex: "#a78bfa", opacity: 0), location: 0.90),
        .init(color: Color(hex: "#a78bfa", opacity: 0), location: 1),
    ])
    private static let second = Gradient(stops: [
        .init(color: Color(hex: "#22d3ee", opacity: 0), location: 0),
        .init(color: Color(hex: "#22d3ee", opacity: 0), location: 0.15),
        .init(color: Color(hex: "#22d3ee"), location: 0.30),
        .init(color: Color(hex: "#22d3ee", opacity: 0), location: 0.45),
        .init(color: Color(hex: "#f0abfc", opacity: 0), location: 0.65),
        .init(color: Color(hex: "#f0abfc"), location: 0.80),
        .init(color: Color(hex: "#f0abfc", opacity: 0), location: 0.95),
        .init(color: Color(hex: "#f0abfc", opacity: 0), location: 1),
    ])

    var body: some View {
        ZStack {
            Circle()
                .fill(AngularGradient(gradient: Self.first, center: .center, angle: .degrees(-90)))
                .frame(width: d * 1.52, height: d * 1.52)
                .blur(radius: d * 0.09)
                .rotationEffect(spin(t, 6))
            Circle()
                .fill(AngularGradient(gradient: Self.second, center: .center, angle: .degrees(0)))
                .frame(width: d * 1.4, height: d * 1.4)
                .blur(radius: d * 0.09)
                .rotationEffect(-spin(t, 8))
        }
    }
}

private struct Star {
    let x: CGFloat
    let y: CGFloat
    let radius: CGFloat
    let color: String
}

/// Babel Breaker: a slowly turning galaxy behind the face.
private struct Cosmos: View {
    let d: CGFloat
    let t: Double

    private static let stars = [
        Star(x: 0.20, y: 0.30, radius: 0.012, color: "#ffffff"),
        Star(x: 0.70, y: 0.18, radius: 0.010, color: "#ffffff"),
        Star(x: 0.84, y: 0.64, radius: 0.014, color: "#ffffff"),
        Star(x: 0.30, y: 0.82, radius: 0.010, color: "#ffffff"),
        Star(x: 0.56, y: 0.92, radius: 0.012, color: "#fbcfe8"),
        Star(x: 0.10, y: 0.56, radius: 0.010, color: "#c7d2fe"),
        Star(x: 0.92, y: 0.40, radius: 0.012, color: "#ffffff"),
        Star(x: 0.44, y: 0.08, radius: 0.010, color: "#c7d2fe"),
    ]

    var body: some View {
        let size = d * 1.44
        ZStack {
            Circle().fill(RadialGradient(gradient: Gradient(stops: [
                .init(color: Color(hex: "#1e1b4b"), location: 0.55),
                .init(color: Color(hex: "#1e1b4b", opacity: 0), location: 1),
            ]), center: .center, startRadius: 0, endRadius: size / 2))
            Circle().fill(AngularGradient(gradient: Gradient(colors: [
                Color(hex: "#6366f1", opacity: 0.55),
                Color(hex: "#ec4899", opacity: 0.45),
                Color(hex: "#1e1b4b", opacity: 0.2),
                Color(hex: "#6366f1", opacity: 0.55),
            ]), center: .center, angle: .degrees(-90)))
            ForEach(0..<Self.stars.count, id: \.self) { i in
                let star = Self.stars[i]
                Circle()
                    .fill(Color(hex: star.color))
                    .frame(width: d * star.radius * 2, height: d * star.radius * 2)
                    .position(x: size * star.x, y: size * star.y)
            }
        }
        .frame(width: size, height: size)
        .rotationEffect(spin(t, 30))
    }
}

/// Tongue of Ages and Omniglot: sun rays fading out from behind the face.
private struct Rays: View {
    let d: CGFloat
    let t: Double
    let rainbow: Bool

    var body: some View {
        let size = d * (rainbow ? 2.1 : 1.9)
        ZStack {
            if rainbow {
                RayWedges(step: 45, offset: 0, width: 5).fill(Color(hex: "#f472b6", opacity: 0.8))
                RayWedges(step: 45, offset: 15, width: 5).fill(Color(hex: "#22d3ee", opacity: 0.8))
                RayWedges(step: 45, offset: 30, width: 5).fill(Color(hex: "#fde047", opacity: 0.8))
            } else {
                RayWedges(step: 18, offset: 0, width: 6).fill(Color(hex: "#fde68a", opacity: 0.85))
            }
        }
        .frame(width: size, height: size)
        .mask {
            RadialGradient(gradient: Gradient(stops: [
                .init(color: .black, location: 0.3),
                .init(color: .black.opacity(0), location: 1),
            ]), center: .center, startRadius: 0, endRadius: size / 2)
        }
        .rotationEffect(spin(t, rainbow ? 18 : 26))
    }
}

private struct RayWedges: Shape {
    /// Degrees from one ray to the next, where the first starts, and how wide each is.
    let step: Double
    let offset: Double
    let width: Double

    func path(in rect: CGRect) -> Path {
        var p = Path()
        let center = CGPoint(x: rect.midX, y: rect.midY)
        let radius = max(rect.width, rect.height) / 2
        var start = offset
        while start < 360 {
            let a0 = CGFloat((start - 90) * .pi / 180)
            let a1 = CGFloat((start + width - 90) * .pi / 180)
            p.move(to: center)
            p.addLine(to: CGPoint(x: center.x + radius * cos(a0), y: center.y + radius * sin(a0)))
            p.addLine(to: CGPoint(x: center.x + radius * cos(a1), y: center.y + radius * sin(a1)))
            p.closeSubpath()
            start += step
        }
        return p
    }
}

/// Tongue of Ages and Omniglot: a pair of golden wings, slowly beating.
private struct Wings: View {
    let d: CGFloat
    let t: Double
    /// How far the wings sit below the avatar's top, as a fraction of `d`.
    let top: CGFloat

    var body: some View {
        ZStack {
            wing
            // The right wing is the left one mirrored about the avatar's centre.
            wing.scaleEffect(x: -1, y: 1)
        }
    }

    private var wing: some View {
        let flap = -9 * wave(t, 2.4)
        return ZStack {
            CurveShape(box: CGSize(width: 50, height: 100), points: [50, 52, 30, 30, 12, 26, 2, 30, 14, 34, 22, 40, 30, 50])
                .fill(Self.gold)
            CurveShape(box: CGSize(width: 50, height: 100), points: [50, 58, 30, 44, 10, 44, 0, 50, 12, 52, 22, 56, 30, 62])
                .fill(Self.gold)
                .opacity(0.9)
            CurveShape(box: CGSize(width: 50, height: 100), points: [50, 64, 34, 58, 16, 62, 6, 70, 18, 70, 28, 70, 36, 72])
                .fill(Self.gold)
                .opacity(0.8)
        }
        .frame(width: d * 0.5, height: d)
        .shadow(color: Color(hex: "#fbbf24", opacity: 0.7), radius: d * 0.04)
        .rotationEffect(.degrees(flap), anchor: UnitPoint(x: 1, y: 0.55))
        .offset(x: -d * 0.67, y: d * top)
    }

    private static let gold = LinearGradient(colors: [Color(hex: "#fffbeb"), Color(hex: "#fbbf24")],
                                             startPoint: .trailing, endPoint: .leading)
}

/// A closed path of cubic curves, written in the coordinates of a `box`-sized
/// SVG viewBox: a start point, then six numbers (two controls and an end) per curve.
private struct CurveShape: Shape {
    let box: CGSize
    let points: [CGFloat]

    func path(in rect: CGRect) -> Path {
        let sx = rect.width / box.width
        let sy = rect.height / box.height
        func point(_ i: Int) -> CGPoint {
            CGPoint(x: rect.minX + points[i] * sx, y: rect.minY + points[i + 1] * sy)
        }
        var p = Path()
        guard points.count >= 2 else { return p }
        p.move(to: point(0))
        var i = 2
        while i + 5 < points.count {
            p.addCurve(to: point(i + 4), control1: point(i), control2: point(i + 2))
            i += 6
        }
        p.closeSubpath()
        return p
    }
}

/// Interpreter: a dotted orbit turning slowly behind the rim.
private struct DashedOrbit: View {
    let d: CGFloat
    let t: Double

    var body: some View {
        let unit = d * 1.4 / 100
        Circle()
            .stroke(Color(hex: "#93c5fd", opacity: 0.8),
                    style: StrokeStyle(lineWidth: 1.2 * unit, lineCap: .round, dash: [2 * unit, 5 * unit]))
            .frame(width: 94 * unit, height: 94 * unit)
            .rotationEffect(spin(t, 14))
    }
}

/// Storyteller: amethyst crystals circling behind the face.
private struct Shards: View {
    let d: CGFloat
    let t: Double

    private static let gradient = LinearGradient(gradient: Gradient(stops: [
        .init(color: Color(hex: "#faf5ff"), location: 0),
        .init(color: Color(hex: "#c084fc"), location: 0.45),
        .init(color: Color(hex: "#6d28d9"), location: 1),
    ]), startPoint: .top, endPoint: .bottom)

    var body: some View {
        ZStack {
            ForEach(0..<8, id: \.self) { i in
                let long = i % 2 == 0
                ShardShape()
                    .fill(Self.gradient)
                    .frame(width: d * 0.09, height: d * (long ? 0.2 : 0.14))
                    .offset(y: -d * (long ? 0.6 : 0.57))
                    .rotationEffect(.degrees(Double(i) * 45))
            }
        }
        .rotationEffect(spin(t, 22))
    }
}

private struct ShardShape: Shape {
    func path(in r: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: r.midX, y: r.minY))
        p.addLine(to: CGPoint(x: r.maxX, y: r.minY + r.height * 0.35))
        p.addLine(to: CGPoint(x: r.minX + r.width * 0.7, y: r.maxY))
        p.addLine(to: CGPoint(x: r.minX + r.width * 0.3, y: r.maxY))
        p.addLine(to: CGPoint(x: r.minX, y: r.minY + r.height * 0.35))
        p.closeSubpath()
        return p
    }
}

// ── In front of the face ─────────────────────────────────────────────────────

private struct BorderFront: View {
    let border: BorderStyle
    let d: CGFloat
    let t: Double

    var body: some View {
        ZStack {
            switch border {
            case .backpacker:
                Studs(d: d)
            case .conversationalist:
                Laurel(d: d)
            case .wordsmith:
                Gems(d: d)
            case .interpreter:
                SparkOrbit(d: d, t: t)
            case .linguist:
                Sparkles(d: d, t: t)
            case .lexicon:
                GlyphOrbit(d: d, t: t, radius: 0.68, period: 18)
            case .babel:
                PlanetOrbits(d: d, t: t, front: true)
            case .ages:
                Halo(d: d, t: t)
            case .omniglot:
                GlyphOrbit(d: d, t: t, radius: 0.74, period: 12)
                Sparkles(d: d, t: t)
            default:
                EmptyView()
            }
        }
    }
}

/// Backpacker: four rivets in the silver.
private struct Studs: View {
    let d: CGFloat

    var body: some View {
        ZStack {
            ForEach([45.0, 135, 225, 315], id: \.self) { degrees in
                Circle()
                    .fill(RadialGradient(gradient: Gradient(stops: [
                        .init(color: .white, location: 0),
                        .init(color: Color(hex: "#9ca3af"), location: 0.6),
                        .init(color: Color(hex: "#374151"), location: 1),
                    ]), center: UnitPoint(x: 0.35, y: 0.35), startRadius: 0, endRadius: d * 0.05))
                    .frame(width: d * 0.07, height: d * 0.07)
                    .offset(y: -d * 0.535)
                    .rotationEffect(.degrees(degrees))
            }
        }
    }
}

/// Conversationalist: a golden laurel, one branch and its mirror image.
private struct Laurel: View {
    let d: CGFloat

    var body: some View {
        let gold = LinearGradient(colors: [Color(hex: "#fde68a"), Color(hex: "#d97706")], startPoint: .top, endPoint: .bottom)
        ZStack {
            LaurelLeaves().fill(gold)
            LaurelStems().stroke(gold, style: StrokeStyle(lineWidth: d * 1.4 / 120 * 1.6, lineCap: .round))
        }
        .frame(width: d * 1.4, height: d * 1.4)
        .shadow(color: .black.opacity(0.5), radius: d * 0.02, x: 0, y: d * 0.01)
    }
}

/// In the SVG's viewBox (-10 -10 120 120): six leaves up the left side, mirrored.
private struct LaurelLeaves: Shape {
    func path(in r: CGRect) -> Path {
        let unit = r.width / 120
        var p = Path()
        for i in 0..<6 {
            let degrees = 250 - 19 * Double(i)
            let a = degrees * .pi / 180
            let x = 50 + cos(a) * 55
            let y = 50 - sin(a) * 55
            let tilt = -degrees - 120
            let rx = CGFloat(8.5 - 0.7 * Double(i)) * unit
            let ry = CGFloat(3.4 - 0.25 * Double(i)) * unit
            let leaf = Path(ellipseIn: CGRect(x: -rx, y: -ry, width: 2 * rx, height: 2 * ry))
            for mirrored in [false, true] {
                let cx = CGFloat(mirrored ? 100 - x : x)
                let angle = CGFloat((mirrored ? -tilt : tilt) * .pi / 180)
                let move = CGAffineTransform(translationX: r.minX + (cx + 10) * unit,
                                             y: r.minY + (CGFloat(y) + 10) * unit)
                p.addPath(leaf, transform: CGAffineTransform(rotationAngle: angle).concatenating(move))
            }
        }
        return p
    }
}

/// The stems: an arc round the avatar from the bottom up to the leaves' tips.
private struct LaurelStems: Shape {
    func path(in r: CGRect) -> Path {
        let unit = r.width / 120
        var p = Path()
        let steps = 36
        for mirrored in [false, true] {
            for k in 0...steps {
                let degrees = 105.15 + (210 - 105.15) * Double(k) / Double(steps)
                let a = degrees * .pi / 180
                var x = 50 + 53 * cos(a)
                let y = 50 + 53 * sin(a)
                if mirrored { x = 100 - x }
                let point = CGPoint(x: r.minX + CGFloat(x + 10) * unit, y: r.minY + CGFloat(y + 10) * unit)
                if k == 0 { p.move(to: point) } else { p.addLine(to: point) }
            }
        }
        return p
    }
}

/// Wordsmith: four cut emeralds on the rim.
private struct Gems: View {
    let d: CGFloat

    private static let gradient = LinearGradient(gradient: Gradient(stops: [
        .init(color: Color(hex: "#ecfdf5"), location: 0),
        .init(color: Color(hex: "#34d399"), location: 0.4),
        .init(color: Color(hex: "#065f46"), location: 1),
    ]), startPoint: .topLeading, endPoint: .bottomTrailing)

    var body: some View {
        ZStack {
            ForEach([0.0, 90, 180, 270], id: \.self) { degrees in
                Rectangle()
                    .fill(Self.gradient)
                    .overlay(Rectangle().strokeBorder(Color.white.opacity(0.8), lineWidth: max(0.5, d * 0.008)))
                    .frame(width: d * 0.12, height: d * 0.12)
                    .shadow(color: Color(hex: "#34d399"), radius: d * 0.05)
                    .rotationEffect(.degrees(45))
                    .offset(y: -d * 0.6)
                    .rotationEffect(.degrees(degrees))
            }
        }
    }
}

/// Interpreter: two sparks racing round the orbit.
private struct SparkOrbit: View {
    let d: CGFloat
    let t: Double

    var body: some View {
        ZStack {
            spark(0.07).offset(y: -d * 0.7)
            spark(0.05).offset(y: d * 0.7)
        }
        .rotationEffect(spin(t, 3.2))
    }

    private func spark(_ size: CGFloat) -> some View {
        Circle()
            .fill(Color.white)
            .frame(width: d * size, height: d * size)
            .shadow(color: .white, radius: d * 0.04)
            .shadow(color: Color(hex: "#60a5fa"), radius: d * 0.1)
            .shadow(color: Color(hex: "#2563eb"), radius: d * 0.18)
    }
}

private struct Spot {
    let x: CGFloat
    let y: CGFloat
    let delay: Double
}

/// Linguist and Omniglot: four-point stars twinkling round the rim.
private struct Sparkles: View {
    let d: CGFloat
    let t: Double

    private static let spots = [
        Spot(x: 8, y: 18, delay: 0), Spot(x: 88, y: 12, delay: 0.5), Spot(x: 96, y: 62, delay: 1.1),
        Spot(x: 4, y: 72, delay: 1.6), Spot(x: 70, y: 96, delay: 0.8), Spot(x: 34, y: -2, delay: 1.3),
    ]
    private static let star: [CGFloat] = [10, 0, 11, 7, 13, 9, 20, 10, 13, 11, 11, 13, 10, 20, 9, 13, 7, 11, 0, 10, 7, 9, 9, 7, 10, 0]

    var body: some View {
        ZStack {
            ForEach(0..<Self.spots.count, id: \.self) { i in
                let spot = Self.spots[i]
                let w = wave(t, 2.1, delay: spot.delay)
                CurveShape(box: CGSize(width: 20, height: 20), points: Self.star)
                    .fill(Color.white)
                    .frame(width: d * 0.16, height: d * 0.16)
                    .shadow(color: .white, radius: d * 0.03)
                    .scaleEffect(0.2 + 0.8 * w)
                    .rotationEffect(.degrees(90 * w))
                    .opacity(w)
                    .offset(x: d * (-0.6 + 1.2 * spot.x / 100), y: d * (-0.6 + 1.2 * spot.y / 100))
            }
        }
    }
}

/// Lexicon Lord and Omniglot: the world's scripts in orbit.
private struct GlyphOrbit: View {
    let d: CGFloat
    let t: Double
    /// Distance from the centre, as a fraction of `d`.
    let radius: CGFloat
    let period: Double

    private static let glyphs = ["A", "あ", "Ж", "ع", "한", "ñ", "字", "Ω"]

    var body: some View {
        ZStack {
            ForEach(0..<Self.glyphs.count, id: \.self) { i in
                let degrees = Double(i) * 45
                Text(Self.glyphs[i])
                    .font(.system(size: d * 0.13, weight: .heavy))
                    .foregroundColor(.white)
                    .shadow(color: Color(hex: "#5eead4"), radius: d * 0.039)
                    .shadow(color: Color(hex: "#a78bfa"), radius: d * 0.078)
                    .rotationEffect(.degrees(-degrees))
                    .offset(y: -d * radius)
                    .rotationEffect(.degrees(degrees))
            }
        }
        .rotationEffect(spin(t, period))
    }
}

private struct Orbit {
    let radius: CGFloat
    /// How far the orbit's plane leans back, and its turn on screen, in degrees.
    let tilt: Double
    let turn: Double
    /// Seconds per lap; negative goes the other way.
    let period: Double
    let planet: CGFloat
    let colors: [String]
}

/// Babel Breaker: two planets on tilted orbits. The far half of each orbit is
/// drawn behind the face and the near half in front, so a planet passes
/// behind the avatar and comes round in front of it.
private struct PlanetOrbits: View {
    let d: CGFloat
    let t: Double
    let front: Bool

    private static let orbits = [
        Orbit(radius: 0.7, tilt: 72, turn: -24, period: 4, planet: 0.1, colors: ["#ffffff", "#f472b6", "#831843"]),
        Orbit(radius: 0.8, tilt: 76, turn: 30, period: -6.5, planet: 0.075, colors: ["#ffffff", "#818cf8", "#312e81"]),
    ]

    var body: some View {
        ZStack {
            ForEach(0..<Self.orbits.count, id: \.self) { i in
                orbitLayer(Self.orbits[i])
            }
        }
    }

    @ViewBuilder
    private func orbitLayer(_ orbit: Orbit) -> some View {
        let r = d * orbit.radius
        let squash = CGFloat(cos(orbit.tilt * .pi / 180))
        let direction: Double = orbit.period < 0 ? -1 : 1
        let theta = cyclePosition(t, abs(orbit.period)) * 2 * .pi * direction
        // In its own plane the planet starts at the top and runs clockwise;
        // leaning the plane back squashes it, then it turns on screen.
        let px = r * CGFloat(sin(theta))
        let py = -r * CGFloat(cos(theta)) * squash
        let turn = orbit.turn * .pi / 180
        let x = px * CGFloat(cos(turn)) - py * CGFloat(sin(turn))
        let y = px * CGFloat(sin(turn)) + py * CGFloat(cos(turn))
        let behind = cos(theta) > 0
        ZStack {
            Ellipse()
                .trim(from: front ? 0 : 0.5, to: front ? 0.5 : 1)
                .stroke(Color(hex: "#c7d2fe", opacity: 0.55), lineWidth: max(0.5, d * 0.008))
                .frame(width: 2 * r, height: 2 * r * squash)
                .rotationEffect(.degrees(orbit.turn))
            if behind != front {
                Circle()
                    .fill(RadialGradient(gradient: Gradient(colors: orbit.colors.map { Color(hex: $0) }),
                                         center: UnitPoint(x: 0.3, y: 0.3), startRadius: 0, endRadius: d * orbit.planet))
                    .frame(width: d * orbit.planet, height: d * orbit.planet)
                    .shadow(color: Color(hex: orbit.colors[1]), radius: d * 0.08)
                    .offset(x: x, y: y)
            }
        }
    }
}

/// Tongue of Ages: a floating halo.
private struct Halo: View {
    let d: CGFloat
    let t: Double

    var body: some View {
        Ellipse()
            .strokeBorder(Color(hex: "#fde68a"), lineWidth: d * 0.035)
            .frame(width: d * 0.62, height: d * 0.14)
            .shadow(color: Color(hex: "#fbbf24"), radius: d * 0.06)
            .offset(y: -d * 0.63 - d * 0.035 * wave(t, 2.4))
    }
}

/// Omniglot: a jewelled crown, floating above everything.
private struct Crown: View {
    let d: CGFloat
    let t: Double

    var body: some View {
        let unit = d * 0.46 / 60
        let gradient = LinearGradient(gradient: Gradient(stops: [
            .init(color: Color(hex: "#fff7c2"), location: 0),
            .init(color: Color(hex: "#facc15"), location: 0.5),
            .init(color: Color(hex: "#b45309"), location: 1),
        ]), startPoint: .top, endPoint: .bottom)
        ZStack {
            CrownShape().fill(gradient)
            CrownShape().stroke(Color(hex: "#fff7c2"), lineWidth: unit)
            jewel("#f472b6", x: 30, y: 25, r: 4, unit: unit)
            jewel("#22d3ee", x: 16, y: 28, r: 2.6, unit: unit)
            jewel("#a78bfa", x: 44, y: 28, r: 2.6, unit: unit)
        }
        .frame(width: d * 0.46, height: d * 0.31)
        .shadow(color: .black.opacity(0.5), radius: d * 0.04, x: 0, y: d * 0.02)
        .shadow(color: Color(hex: "#facc15"), radius: d * 0.05)
        .offset(y: -d * 0.705 - d * 0.035 * wave(t, 2))
    }

    private func jewel(_ color: String, x: CGFloat, y: CGFloat, r: CGFloat, unit: CGFloat) -> some View {
        Circle()
            .fill(Color(hex: color))
            .frame(width: 2 * r * unit, height: 2 * r * unit)
            .position(x: x * unit, y: y * unit * (0.31 / 0.46) * (60.0 / 40.0))
    }
}

private struct CrownShape: Shape {
    func path(in r: CGRect) -> Path {
        let points: [(CGFloat, CGFloat)] = [(4, 34), (8, 10), (20, 22), (30, 4), (40, 22), (52, 10), (56, 34)]
        var p = Path()
        for (i, point) in points.enumerated() {
            let mapped = CGPoint(x: r.minX + point.0 / 60 * r.width, y: r.minY + point.1 / 40 * r.height)
            if i == 0 { p.move(to: mapped) } else { p.addLine(to: mapped) }
        }
        p.closeSubpath()
        return p
    }
}

#if DEBUG
/// Every border at once, for the CI check's simulator screenshots
/// (launch argument -SprindBorderGallery).
struct BorderGalleryView: View {
    private static let ranks: [(BorderStyle, Int, String, String)] = [
        (.tourist, 1, "#e2e8f0", "#94a3b8"), (.phrasebook, 5, "#f59e0b", "#b45309"),
        (.backpacker, 10, "#e5e7eb", "#9ca3af"), (.conversationalist, 15, "#facc15", "#f59e0b"),
        (.wordsmith, 20, "#34d399", "#059669"), (.interpreter, 25, "#60a5fa", "#2563eb"),
        (.storyteller, 30, "#c084fc", "#7c3aed"), (.polyglot, 40, "#fb7185", "#e11d48"),
        (.linguist, 50, "#f0abfc", "#22d3ee"), (.lexicon, 60, "#5eead4", "#a78bfa"),
        (.babel, 75, "#a5b4fc", "#f472b6"), (.ages, 90, "#fde68a", "#fbbf24"),
        (.omniglot, 100, "#ffffff", "#f472b6"),
    ]

    var body: some View {
        ZStack {
            LinearGradient(colors: [Color(hex: "#1e1b4b"), Color(hex: "#4c1d95")], startPoint: .top, endPoint: .bottom)
                .ignoresSafeArea()
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 3), spacing: 54) {
                ForEach(0..<Self.ranks.count, id: \.self) { i in
                    let rank = Self.ranks[i]
                    LevelAvatarView(border: rank.0, level: rank.1, color: Color(hex: rank.2), accent: Color(hex: rank.3),
                                    size: 62, initials: "AM")
                }
            }
            .padding(.horizontal, 24)
        }
    }
}
#endif
