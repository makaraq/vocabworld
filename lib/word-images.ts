// Flashcard illustrations, keyed by vocabulary id. The art is language-neutral,
// so one image serves a word in every language. Files live in
// public/word-images/<id>.webp (transparent, trimmed, long side 640px). Listing
// ids here, rather than probing the URL, means a word without art never fires
// a 404.
const WORD_IMAGE_IDS = new Set<number>([
  // Greetings (topic 1): every word. "catch you later" (2712) and "see you
  // soon" (2715) had no art and were unlinked from the topic (topic_id null).
  2682, // hello
  2683, // good morning
  2684, // good evening
  2685, // good night
  2686, // my name is Alex
  2687, // what is your name?
  2688, // nice to meet you
  2689, // how are you?
  2690, // I'm fine, thank you
  2692, // please
  2693, // thank you
  2694, // yes
  2695, // no
  2696, // okay
  2697, // sure
  2698, // you're welcome
  2699, // excuse me
  2700, // sorry
  2701, // no problem
  2702, // welcome
  2703, // come in
  2704, // how do you do?
  2705, // pleasure to meet you
  2708, // what's up?
  2709, // long time no see
  2710, // how's it going?
  2711, // glad to see you
  2713, // bye
  2714, // goodbye
  2716, // talk to you later
  2717, // have a good evening

  // Numbers (topic 2): every word. Cardinals 1-20 show the numeral over that
  // many dots; ordinals mark their place in a row of ten. All share one crop
  // frame so the numerals stay the same size from card to card.
  2718, 2719, 2720, 2721, 2722, 2723, 2724, 2725, 2726, 2727, // zero – nine
  2728, 2729, 2730, 2731, 2732, 2733, 2734, 2735, 2736, 2737, // ten – nineteen
  2738, 2739, 2740, 2741, 2742, 2743, 2744, 2745, // twenty – ninety
  2746, // one hundred
  2747, // number
  2748, 2749, 2750, // many, few, several
  2751, 2752, // all, none
  2753, 2754, // more, less
  2755, 2756, 2757, 2758, 2759, 2760, 2761, 2762, 2763, 2764, // first – tenth

  // Time (topic 3): every word. Weekdays mark their place in a Monday-first
  // week; months show their number. Winter's snowflake and the morning and
  // evening clouds were recoloured from navy, which vanished on dark cards.
  2765, 2766, 2767, 2768, // hour, minute, second, o'clock
  2769, 2770, 2771, 2772, // morning, afternoon, evening, night
  2773, 2774, 2775, // today, tomorrow, yesterday
  2776, 2777, 2778, 2779, // now, later, early, late
  2780, 2781, 2782, 2783, 2784, 2785, 2786, // Monday – Sunday
  2787, 2788, 2789, 2790, 2791, 2792, 2793, 2794, 2795, 2796, 2797, 2798, // January – December
  2799, 2800, 2801, 2802, // day, week, month, year
  2803, 2804, 2805, 2806, // spring, summer, autumn, winter
  2807, 2808, 2809, 2810, // birthday, holiday, weekend, weekday

  // Emergency (topic 7): every word. emergency, help, safe and earthquake each
  // appear twice in the topic; both rows share one image.
  399, 400, 401, 402, 403, 404, 405, 406, 407, // basic safety words: danger – caution
  408, 409, 410, 411, 412, 413, 414, 415, 416, // people involved: police – victim
  417, 418, 419, 420, 421, 422, 423, 424, 425, // places & locations: hospital – street
  426, 427, 428, 429, 430, 431, 432, 433, 434, 435, // common emergency objects & equipment: first aid kit – life jacket
  436, 437, 438, 439, 440, 441, 442, 443, 444, 445, 446, 447, // natural disaster & danger words: fire – explosion
  448, 449, 450, 451, 452, 453, 454, 455, 456, 457, // actions & verbs: call – protect
  458, 459, 460, 461, 462, 463, 464, 465, 466, // safety qualities & conditions: dangerous – emergency
  467, 468, 469, 470, 471, 472, 473, 474, 475, // useful phrases: Call the police! – Is everyone okay?

  // Directions (topic 4): every word. The 20 diagrams share one crop frame so
  // near/far keep their distances; "turn" is the left and right turn arrows on
  // one stem (it shipped identical to "turn right"), and the navy roads in
  // crossroads, at the corner, follow the road and across from are slate.
  2811, 2812, 2813, 2814, 2815, 2816, // basic direction words: left, right, straight, turn, stop, go
  2817, 2818, 2819, 2820, 2821, 2822, 2823, 2824, 2825, 2826, // asking and giving directions: go straight ahead – follow the road
  2827, 2828, 2829, 2830, 2831, // asking and giving directions: crossroads – how do I get to downtown?
  2832, 2833, 2834, 2835, 2836, 2837, 2838, 2839, 2840, // places for transportation: bus stop – terminal
  2841, 2842, 2843, 2844, 2845, 2846, 2847, 2848, 2849, 2850, // common transport types: bus – ferry
  2851, // common transport types: boat
  2852, 2853, 2854, 2855, 2856, 2857, 2858, 2859, 2860, 2861, // travel-related words: ticket – route
  2862, 2863, // travel-related words: stopover, destination
  2864, 2865, 2866, 2867, 2868, 2869, 2870, // helpful phrases for transport: how much is the fare? – how long does it take?

  // Travel (topic 18): every word. ticket, luggage, map and schedule reuse the
  // Directions art for the same words (separate ids, same drawing).
  1064, 1065, 1066, 1067, 1068, 1069, 1070, 1071, 1072, 1073, // transportation & travel essentials: ticket – schedule
  1074, 1075, 1076, 1077, 1078, 1079, 1080, 1081, 1082, 1083, // accommodations: hotel – reservation
  1084, 1085, 1086, 1087, 1088, 1089, 1090, 1091, 1092, 1093, // tourist attractions & locations: beach – square
  1094, 1095, 1096, 1097, 1098, 1099, 1100, 1101, 1102, 1103, // travel activities: sightseeing – cycling
  1104, 1105, 1106, 1107, 1108, // common phrases: Where is the hotel? – What time does the tour start?
])

// The art is not bundled into the native apps (it would grow the install with
// every topic), so the bundled app loads it from the live site, the same way
// its /api/ calls are rerouted in app/layout.tsx. lib/offline/word-image-cache.ts
// keeps a copy of each image so it shows offline too.
function imageOrigin(): string {
  if (typeof window === 'undefined') return ''
  const cap = (window as any).Capacitor
  const bundled = cap?.isNativePlatform?.() && window.location.hostname === 'localhost' && !window.location.port
  return bundled ? 'https://www.sprind.uk' : ''
}

export function hasWordImage(vocabularyId: unknown): boolean {
  return WORD_IMAGE_IDS.has(Number(vocabularyId))
}

export function getWordImageUrl(vocabularyId: unknown): string | null {
  const id = Number(vocabularyId)
  return WORD_IMAGE_IDS.has(id) ? `${imageOrigin()}/word-images/${id}.webp` : null
}
