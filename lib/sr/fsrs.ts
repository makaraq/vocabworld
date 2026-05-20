export const enum State {
  New = 0,
  Learning = 1,
  Review = 2,
  Relearning = 3,
}

export const enum Rating {
  Again = 1,
  Hard = 2,
  Good = 3,
  Easy = 4,
}

export interface SRCard {
  state: State
  difficulty: number
  stability: number
  due: Date
  lastReview: Date | null
  reps: number
  lapses: number
}

// FSRS-5 default parameters
const w = [
  0.4072, 1.1829, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.0589,
  1.5330, 0.1647, 1.0621, 1.9744, 0.0946, 0.3597, 2.2053, 0.2315,
  2.9898, 0.5163, 0.6571,
]

const DECAY = -0.5
const FACTOR = 0.9 ** (1 / DECAY) - 1

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function initDifficulty(rating: Rating): number {
  return clamp(w[4] - Math.exp(w[5] * (rating - 1)) + 1, 1, 10)
}

function initStability(rating: Rating): number {
  return Math.max(w[rating - 1], 0.1)
}

function nextDifficulty(d: number, rating: Rating): number {
  const delta = d - w[6] * (rating - 3)
  return clamp(w[7] * initDifficulty(Rating.Easy) + (1 - w[7]) * delta, 1, 10)
}

function retrievability(elapsedDays: number, stability: number): number {
  return (1 + FACTOR * (elapsedDays / stability)) ** DECAY
}

function nextRecallStability(
  d: number,
  s: number,
  r: number,
  rating: Rating
): number {
  const hardPenalty = rating === Rating.Hard ? w[15] : 1
  const easyBonus = rating === Rating.Easy ? w[16] : 1
  return (
    s *
    (1 +
      Math.exp(w[8]) *
        (11 - d) *
        s ** (-w[9]) *
        (Math.exp((1 - r) * w[10]) - 1) *
        hardPenalty *
        easyBonus)
  )
}

function nextForgetStability(
  d: number,
  s: number,
  r: number
): number {
  return Math.max(
    w[11] *
      d ** (-w[12]) *
      ((s + 1) ** w[13] - 1) *
      Math.exp((1 - r) * w[14]),
    0.1
  )
}

function nextInterval(stability: number): number {
  return Math.max(Math.round(stability * 9), 1)
}

export function schedule(
  card: SRCard,
  rating: Rating,
  now: Date = new Date()
): SRCard {
  const elapsedDays =
    card.lastReview != null
      ? Math.max(
          (now.getTime() - card.lastReview.getTime()) / (1000 * 60 * 60 * 24),
          0
        )
      : 0

  let { difficulty, stability, state, reps, lapses } = card

  if (state === State.New) {
    difficulty = initDifficulty(rating)
    stability = initStability(rating)
    reps = 1

    if (rating === Rating.Again) {
      state = State.Learning
      return {
        state,
        difficulty,
        stability,
        due: new Date(now.getTime() + 60 * 1000),
        lastReview: now,
        reps,
        lapses,
      }
    }

    state = State.Review
    const interval = nextInterval(stability)
    return {
      state,
      difficulty,
      stability,
      due: new Date(now.getTime() + interval * 24 * 60 * 60 * 1000),
      lastReview: now,
      reps,
      lapses,
    }
  }

  const r = retrievability(elapsedDays, stability)
  difficulty = nextDifficulty(difficulty, rating)
  reps += 1

  if (rating === Rating.Again) {
    lapses += 1
    stability = nextForgetStability(difficulty, stability, r)
    state = state === State.Review ? State.Relearning : State.Learning

    return {
      state,
      difficulty,
      stability,
      due: new Date(now.getTime() + 5 * 60 * 1000),
      lastReview: now,
      reps,
      lapses,
    }
  }

  stability = nextRecallStability(difficulty, stability, r, rating)
  state = State.Review
  const interval = nextInterval(stability)

  return {
    state,
    difficulty,
    stability,
    due: new Date(now.getTime() + interval * 24 * 60 * 60 * 1000),
    lastReview: now,
    reps,
    lapses,
  }
}
