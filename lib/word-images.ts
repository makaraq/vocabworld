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

  // Emergency (topic 7): every word. The second copies of emergency, help,
  // safe and earthquake (466, 450, 459, 445) were unlinked from the topic
  // (topic_id null); they keep their art in case they come back.
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

  // Shopping (topic 5): every word; market reuses the Travel art.
  2871, 2872, 2873, 2874, 2875, 2876, 2877, 2878, 2879, 2880, // basic shopping words: shop – buy
  2881, // basic shopping words: sell
  2882, 2883, 2884, 2885, 2886, 2887, 2888, 2889, 2890, 2891, // items and transactions: product – wallet
  2892, // items and transactions: bag
  2893, 2894, 2895, 2896, 2897, 2898, 2899, 2900, // types of shops: supermarket – department store
  2901, 2902, 2903, 2904, 2905, 2906, 2907, 2908, 2909, 2910, // money-related vocabulary: currency – cost
  2911, // money-related vocabulary: value
  2912, 2913, 2914, 2915, 2916, 2917, 2918, 2919, 2920, 2921, // useful & advanced phrases: how much is this? – I don't have change
  2922, 2923, 2924, 2925, 2926, 2927, 2928, // useful & advanced phrases: can you lower the price? – is this on sale?

  // Food (topic 6): every word. Its kitchen and table words are reused by Home.
  251, 252, 253, 254, 255, 256, 257, 258, 259, 260, // basic food & drink words: food – tea
  261, 262, 263, 264, // basic food & drink words: coffee, soda, milkshake, smoothie
  265, 266, 267, 268, 269, 270, 271, 272, 273, 274, // grains & starches: bread – quinoa
  275, 276, 277, 278, 279, 280, 281, 282, 283, 284, // meats & protein: chicken – tofu
  285, 286, 287, // meats & protein: beans, lentils, nuts
  288, 289, 290, 291, 292, 293, 294, 295, 296, 297, // fruits: apple – pineapple
  298, 299, 300, 301, 302, // fruits: mango, peach, cherry, pear, kiwi
  303, 305, 306, 307, 308, 309, 310, 311, 312, 313, // vegetables: tomato – garlic
  314, 315, 316, 317, // vegetables: mushroom, zucchini, cabbage, peas
  318, 319, 320, 321, 322, 323, 324, 325, 326, 327, // spices & condiments: salt – vinegar
  328, 329, 330, 331, // spices & condiments: mustard, ketchup, mayonnaise, soy sauce
  336, 338, 339, 340, 341, 342, // drinks & beverages: milk, wine, beer, cocktail, lemonade, hot chocolate
  343, 344, 345, 346, 347, 348, 349, 350, 351, 352, // desserts & sweets: cake – tart
  353, 354, 355, 356, 357, 358, 359, 360, 361, 362, // restaurant & kitchen items: restaurant – bowl
  363, 364, 365, 366, 367, 368, 369, 370, 371, 372, // restaurant & kitchen items: napkin – oven
  373, 374, 375, // restaurant & kitchen items: refrigerator, pan, pot
  376, 377, 378, 379, 380, 381, 382, 383, 384, 385, // food qualities & types: fresh – raw
  386, 387, 388, 389, // food qualities & types: healthy, tasty, delicious, burnt
  390, 391, 392, 393, 394, 395, 396, 397, 398, // useful phrases: I'm hungry – Is service included?

  // Home (topic 9): every word. room and bed reuse the Travel art; kitchen,
  // chair, table, the appliances and the tableware reuse Food's.
  563, 564, 565, 566, 567, 568, 569, 570, 571, 572, // rooms & areas: house – garden
  573, 574, 575, 576, // rooms & areas: balcony, garage, attic, basement
  577, 578, 579, 580, 581, 582, 583, 584, 585, 586, // furniture: bed – cupboard
  587, 588, 589, 590, 591, // furniture: shelf, dresser, stool, bench, cabinet
  592, 593, 594, 595, 596, 597, 598, 599, 600, 601, // household appliances & electronics: refrigerator – iron
  602, 603, 604, 605, 606, // household appliances & electronics: fan, heater, air conditioner, lamp, light
  607, 608, 609, 610, 611, 612, 613, 614, 615, 616, // kitchen items & utensils: plate – kettle
  617, 618, 619, 620, 621, // kitchen items & utensils: blender, cutting board, ladle, spatula, mug
  622, 623, 624, 625, 626, 627, 628, 629, 630, 631, // cleaning & maintenance: broom – garbage bag
  632, 633, 634, // cleaning & maintenance: recycling, dust, cloth
  635, 636, 637, 638, 639, 640, 641, 642, 643, 644, // other household items: door – clock
  645, 646, 647, // other household items: picture, book, plant
  648, 649, 650, 651, 652, 653, 654, // useful phrases: Where is the bathroom? – Please bring me a blanket

  // Health & Body Parts (topic 8): every word. The two "cough" rows are the
  // illness and the action, with a picture each; doctor, nurse, hospital,
  // clinic, "Call an ambulance" and "I am injured" reuse the Emergency art.
  476, 477, 478, 479, 480, 481, 482, 483, 484, 485, // basic body parts: head – teeth
  486, 487, 488, 489, 490, 491, 492, 493, 494, 495, // basic body parts: tongue – chest
  496, 497, 498, 499, 500, 501, 502, 503, // basic body parts: back, stomach, waist, hip, leg, knee, foot, toe
  504, 505, 506, 507, 508, 510, 511, 512, 513, // internal organs: brain – spleen
  514, 515, 516, 517, 518, 519, 520, 521, 522, 523, // health & medical vocabulary: doctor – appointment
  524, 525, 526, 527, 528, 529, 530, 531, 532, 533, // health & medical vocabulary: checkup – allergy
  534, 535, 536, 537, 538, 539, 540, 541, 542, 543, // actions & conditions: breathe – break
  544, 545, // actions & conditions: stretch, exercise
  546, 547, 548, 549, 550, 551, 552, 553, 554, // adjectives for health: healthy – contagious
  555, 556, 557, 558, 559, 560, 561, 562, // useful phrases: I feel sick – I am injured

  // Personal Style (topic 10): every word. wallet and "Do you have this in
  // another color?" reuse the Shopping art, backpack the Travel art.
  655, 656, 657, 658, 659, 660, 661, 662, 663, 664, // basic clothing: shirt – skirt
  665, 666, 667, 668, 669, 670, 671, 672, 673, 674, // basic clothing: jeans – gloves
  675, 676, 677, 678, 679, 680, 681, 682, // basic clothing: hat – heels
  683, 684, 685, 686, 687, 688, 689, 690, 691, 692, // accessories: watch – sunglasses
  693, 694, 695, 696, 697, 698, 699, 700, 701, // materials & features: cotton – fabric
  702, 703, 704, 705, 706, 707, 708, 709, 710, 711, // styles & descriptions: fashion – colorful
  712, 713, 714, 715, // styles & descriptions: plain – patterned
  716, 717, 718, 719, 720, // useful phrases: What size is this? – This is too loose.

  // Weather & Nature (topic 11): every word. river and lake reuse the Places
  // Around Town art, mountain the Travel art, storm and lightning the
  // Emergency art, and the seasons the Time art, with "fall" (752) as autumn.
  721, 722, 723, 724, 725, 726, 727, 728, 729, 730, // basic weather terms: weather – fog
  731, 732, 733, 734, // basic weather terms: sun – thunder
  735, 736, 737, 738, 739, 740, 741, 742, 743, 744, // types of weather: hot – stormy
  745, 746, 747, 748, // types of weather: foggy – wet
  749, 750, 751, 752, 753, 754, // seasons: spring – season
  755, 756, 757, 758, 759, 760, 761, 762, 763, 764, // weather changes: clear – breeze
  765, // weather changes: gust
  766, 767, 768, 769, 770, // useful phrases: What's the weather like today? – The temperature is dropping.
  1152, 1153, 1154, 1155, 1156, 1157, 1158, 1159, 1160, 1161, // landforms & landscapes: mountain – island
  1162, 1163, 1164, 1165, 1166, 1167, 1168, 1169, 1170, 1171, // water & bodies of water: river – coast
  1172, 1173, 1174, 1175, 1176, 1177, 1178, 1179, 1180, 1181, // plants & vegetation: tree – moss
  1192, 1193, 1194, 1195, 1196, // useful phrases: The mountain is tall. – Look at that beautiful tree.

  // Places Around Town (topic 17): every word. Half the topic reuses art from
  // earlier topics: the hospital, clinic, police and fire stations from
  // Emergency, the shops from Shopping, café and restaurant from Food, garden
  // from Home, and the stations, streets and sights from Directions and Travel.
  1009, 1010, 1011, 1012, 1013, 1014, 1015, 1016, 1017, 1018, // public buildings: school – art gallery
  1019, 1020, 1021, 1022, 1023, 1024, 1025, 1026, 1027, 1028, // shops & markets: supermarket – hardware store
  1029, 1030, 1031, 1032, 1033, 1034, 1035, 1036, 1037, 1038, // parks & recreation: park – sports center
  1039, 1040, 1041, 1042, 1043, 1044, 1045, 1046, 1047, 1048, // transportation & streets: bus stop – crossing
  1049, 1050, 1051, 1052, 1053, 1054, 1055, 1057, 1058, // other places: church – fountain
  1059, 1060, 1061, 1062, 1063, // useful phrases: Where is the library? – Can you show me the way to the train station?
  // Family (topic 12): family through best friend. neighbor – host and the
  // five phrases are still to come (their download was cut short).
  771, 772, 773, 774, 775, 776, 777, 778, 779, 780, 781, // immediate family: family – siblings
  782, 783, 784, 785, 786, 787, 788, 789, 790, 791, 792, // extended family: grandmother – relative
  793, 794, 795, 796, 797, 798, 799, 800, 801, 802, 803, 804, 805, 806, 807, // partners & marriage: husband – ex-wife
  808, 809, // other relationships: friend, best friend
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
