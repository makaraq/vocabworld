// The topic menu, exactly as the app lays it out: the same eight sections in
// the same order, each with the same topics and the same mdi tile icons, from
// components/language/language-selector.tsx, app/api/topics/route.ts and
// lib/icons/topic-icons.ts.
//
// Copied rather than fetched so the showcase on the landing page paints on the
// first frame. Regenerate by hand if the real menu is reordered; nothing
// breaks if it drifts, the page just shows a slightly older menu.

export interface ShowcaseTopic {
  id: number
  name: string
  /** Iconify name, e.g. `mdi:counter`. */
  icon: string
}

export interface ShowcaseSection {
  name: string
  /** Inline SVG for the section header. */
  icon: string
  topics: ShowcaseTopic[]
}

export const SHOWCASE_SECTIONS: ShowcaseSection[] = [
  {
    name: "ACCOUNT",
    icon: "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\"><g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><path fill=\"currentColor\" fill-opacity=\"0\" stroke-dasharray=\"20\" stroke-dashoffset=\"20\" d=\"M12 12c2.21 0 4 -1.79 4 -4c0 -2.21 -1.79 -4 -4 -4c-2.21 0 -4 1.79 -4 4c0 2.21 1.79 4 4 4Z\"><animate fill=\"freeze\" attributeName=\"fill-opacity\" begin=\"0.8s\" dur=\"0.15s\" values=\"0;0.3\"/><animate fill=\"freeze\" attributeName=\"stroke-dashoffset\" dur=\"0.6s\" values=\"20;0\"/></path><path stroke-dasharray=\"36\" stroke-dashoffset=\"36\" d=\"M20 20c0 -4.42 -3.58 -8 -8 -8c-4.42 0 -8 3.58 -8 8\"><animate fill=\"freeze\" attributeName=\"stroke-dashoffset\" begin=\"0.6s\" dur=\"0.4s\" values=\"36;0\"/></path></g></svg>",
    topics: [

    ],
  },
  {
    name: "FIRST AID KIT",
    icon: "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\"><mask id=\"SVGDmnSdctG\"><g fill=\"none\" stroke=\"#fff\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><path fill=\"#fff\" fill-opacity=\"0\" stroke-dasharray=\"64\" stroke-dashoffset=\"64\" d=\"M9 7h11c0.55 0 1 0.45 1 1v11c0 0.55 -0.45 1 -1 1h-16c-0.55 0 -1 -0.45 -1 -1v-11c0 -0.55 0.45 -1 1 -1Z\"><animate fill=\"freeze\" attributeName=\"fill-opacity\" begin=\"0.9s\" dur=\"0.5s\" values=\"0;1\"/><animate fill=\"freeze\" attributeName=\"stroke-dashoffset\" dur=\"0.6s\" values=\"64;0\"/></path><path stroke-dasharray=\"16\" stroke-dashoffset=\"16\" d=\"M9 7v-3c0 -0.55 0.45 -1 1 -1h4c0.55 0 1 0.45 1 1v3\"><animate fill=\"freeze\" attributeName=\"stroke-dashoffset\" begin=\"0.7s\" dur=\"0.2s\" values=\"16;0\"/></path><path stroke=\"#000\" stroke-dasharray=\"8\" stroke-dashoffset=\"8\" d=\"M12 11v6\"><animate fill=\"freeze\" attributeName=\"stroke-dashoffset\" begin=\"1.4s\" dur=\"0.2s\" values=\"8;0\"/></path><path stroke=\"#000\" stroke-dasharray=\"8\" stroke-dashoffset=\"8\" d=\"M9 14h6\"><animate fill=\"freeze\" attributeName=\"stroke-dashoffset\" begin=\"1.6s\" dur=\"0.2s\" values=\"8;0\"/></path></g></mask><rect width=\"24\" height=\"24\" fill=\"currentColor\" mask=\"url(#SVGDmnSdctG)\"/></svg>",
    topics: [
      { id: 1, name: "Greetings", icon: "mdi:human-greeting-variant" },
      { id: 2, name: "Numbers", icon: "mdi:counter" },
      { id: 3, name: "Time", icon: "mdi:timer-sand" },
      { id: 7, name: "Emergency", icon: "mdi:car-brake-alert" },
      { id: 4, name: "Directions", icon: "mdi:arrow-decision" },
      { id: 18, name: "Travel", icon: "sprind:travel" },
    ],
  },
  {
    name: "DAILY LIFE",
    icon: "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" fill-opacity=\"0\" d=\"M17 14v4c0 1.66 -1.34 3 -3 3h-6c-1.66 0 -3 -1.34 -3 -3v-4Z\"><animate fill=\"freeze\" attributeName=\"fill-opacity\" begin=\"0.8s\" dur=\"0.15s\" values=\"0;0.3\"/></path><g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><path stroke-dasharray=\"48\" stroke-dashoffset=\"48\" d=\"M17 9v9c0 1.66 -1.34 3 -3 3h-6c-1.66 0 -3 -1.34 -3 -3v-9Z\"><animate fill=\"freeze\" attributeName=\"stroke-dashoffset\" dur=\"0.6s\" values=\"48;0\"/></path><path stroke-dasharray=\"14\" stroke-dashoffset=\"14\" d=\"M17 9h3c0.55 0 1 0.45 1 1v3c0 0.55 -0.45 1 -1 1h-3\"><animate fill=\"freeze\" attributeName=\"stroke-dashoffset\" begin=\"0.6s\" dur=\"0.2s\" values=\"14;0\"/></path><mask id=\"SVGnGEayvOG\"><path stroke=\"#fff\" d=\"M8 0c0 2-2 2-2 4s2 2 2 4-2 2-2 4 2 2 2 4M12 0c0 2-2 2-2 4s2 2 2 4-2 2-2 4 2 2 2 4M16 0c0 2-2 2-2 4s2 2 2 4-2 2-2 4 2 2 2 4\"><animateMotion calcMode=\"linear\" dur=\"3s\" path=\"M0 0v-8\" repeatCount=\"indefinite\"/></path></mask><rect width=\"24\" height=\"0\" y=\"7\" fill=\"currentColor\" mask=\"url(#SVGnGEayvOG)\"><animate fill=\"freeze\" attributeName=\"y\" begin=\"0.8s\" dur=\"0.6s\" values=\"7;2\"/><animate fill=\"freeze\" attributeName=\"height\" begin=\"0.8s\" dur=\"0.6s\" values=\"0;5\"/></rect></g></svg>",
    topics: [
      { id: 5, name: "Shopping", icon: "mdi:shopping-cart-outline" },
      { id: 6, name: "Food", icon: "mdi:noodles" },
      { id: 9, name: "Home", icon: "mdi:house-outline" },
      { id: 17, name: "Places Around Town", icon: "mdi:city-variant-outline" },
      { id: 12, name: "Family & Relationships", icon: "mdi:human-male-female-child" },
      { id: 8, name: "Health & Body Parts", icon: "mdi:hospital-box-outline" },
      { id: 11, name: "Weather & Nature", icon: "mdi:weather-partly-cloudy" },
      { id: 10, name: "Personal Style", icon: "mdi:hanger" },
    ],
  },
  {
    name: "WORK & SCHOOL",
    icon: "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\"><g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><path stroke-dasharray=\"20\" stroke-dashoffset=\"20\" d=\"M3 21h18\"><animate fill=\"freeze\" attributeName=\"stroke-dashoffset\" dur=\"0.2s\" values=\"20;0\"/></path><path fill=\"currentColor\" fill-opacity=\"0\" stroke-dasharray=\"48\" stroke-dashoffset=\"48\" d=\"M7 17v-4l10 -10l4 4l-10 10h-4\"><animate fill=\"freeze\" attributeName=\"fill-opacity\" begin=\"1.1s\" dur=\"0.15s\" values=\"0;0.3\"/><animate fill=\"freeze\" attributeName=\"stroke-dashoffset\" begin=\"0.2s\" dur=\"0.6s\" values=\"48;0\"/></path><path stroke-dasharray=\"8\" stroke-dashoffset=\"8\" d=\"M14 6l4 4\"><animate fill=\"freeze\" attributeName=\"stroke-dashoffset\" begin=\"0.8s\" dur=\"0.2s\" values=\"8;0\"/></path></g></svg>",
    topics: [
      { id: 25, name: "Professions", icon: "mdi:briefcase-variant-outline" },
      { id: 26, name: "Education", icon: "mdi:school-outline" },
      { id: 34, name: "History", icon: "mdi:pillar" },
      { id: 32, name: "Science", icon: "mdi:flask-outline" },
      { id: 24, name: "Technology", icon: "mdi:devices" },
      { id: 23, name: "Art", icon: "mdi:drama-masks" },
      { id: 33, name: "Mathematics", icon: "mdi:calculator-variant-outline" },
      { id: 19, name: "Colors & Shapes", icon: "mdi:palette" },
    ],
  },
  {
    name: "PERSONAL & SOCIAL LIFE",
    icon: "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\"><mask id=\"SVGydZajcRT\"><g fill=\"none\" stroke=\"#fff\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\"><path fill=\"#fff\" fill-opacity=\"0\" stroke-dasharray=\"64\" stroke-dashoffset=\"64\" d=\"M12 3c4.97 0 9 4.03 9 9c0 4.97 -4.03 9 -9 9c-4.97 0 -9 -4.03 -9 -9c0 -4.97 4.03 -9 9 -9\"><animate fill=\"freeze\" attributeName=\"fill-opacity\" begin=\"0.7s\" dur=\"0.5s\" values=\"0;1\"/><animate fill=\"freeze\" attributeName=\"stroke-dashoffset\" dur=\"0.6s\" values=\"64;0\"/></path><path stroke=\"#000\" stroke-dasharray=\"2\" stroke-dashoffset=\"2\" d=\"M9 9v1\"><animate fill=\"freeze\" attributeName=\"stroke-dashoffset\" begin=\"1.2s\" dur=\"0.2s\" values=\"2;0\"/></path><path stroke=\"#000\" stroke-dasharray=\"2\" stroke-dashoffset=\"2\" d=\"M15 9v1\"><animate fill=\"freeze\" attributeName=\"stroke-dashoffset\" begin=\"1.4s\" dur=\"0.2s\" values=\"2;0\"/></path><path stroke=\"#000\" stroke-dasharray=\"12\" stroke-dashoffset=\"12\" d=\"M8 14c0.5 1.5 1.79 3 4 3c2.21 0 3.5 -1.5 4 -3\"><animate fill=\"freeze\" attributeName=\"stroke-dashoffset\" begin=\"1.6s\" dur=\"0.2s\" values=\"12;0\"/></path></g></mask><rect width=\"24\" height=\"24\" fill=\"currentColor\" mask=\"url(#SVGydZajcRT)\"/></svg>",
    topics: [
      { id: 13, name: "Emotions", icon: "mdi:emoticon-outline" },
      { id: 14, name: "Personality", icon: "mdi:head-cog-outline" },
      { id: 21, name: "Actions", icon: "mdi:lightning-bolt-outline" },
      { id: 15, name: "Hobbies", icon: "mdi:controller-classic" },
      { id: 16, name: "Fitness", icon: "mdi:dumbbell" },
      { id: 22, name: "Adjectives", icon: "mdi:magnify-plus-outline" },
    ],
  },
  {
    name: "CULTURE & SOCIETY",
    icon: "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\"><path fill=\"none\" stroke=\"currentColor\" stroke-dasharray=\"80\" stroke-dashoffset=\"80\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M7.47 5.94c1.83 1.37 3.81 4.14 4.53 5.63c0.72 -1.49 2.7 -4.26 4.53 -5.63c1.33 -0.99 3.47 -1.75 3.47 0.68c0 0.49 -0.28 4.08 -0.45 4.66c-0.57 2.03 -2.65 2.55 -4.5 2.23c3.24 0.55 4.06 2.36 2.28 4.17c-3.38 3.44 -4.85 -0.87 -5.23 -1.97c-0.07 -0.2 -0.1 -0.3 -0.1 -0.22c-0 -0.08 -0.03 0.02 -0.1 0.22c-0.38 1.1 -1.86 5.41 -5.23 1.97c-1.78 -1.81 -0.96 -3.63 2.28 -4.17c-1.85 0.31 -3.93 -0.21 -4.5 -2.23c-0.17 -0.58 -0.45 -4.18 -0.45 -4.66c0 -2.43 2.14 -1.67 3.47 -0.68Z\"><animate fill=\"freeze\" attributeName=\"stroke-dashoffset\" dur=\"0.6s\" values=\"80;0\"/></path></svg>",
    topics: [
      { id: 29, name: "Business", icon: "mdi:handshake-outline" },
      { id: 35, name: "Politics & Law", icon: "mdi:scale-balance" },
      { id: 36, name: "Religion", icon: "mdi:meditation" },
      { id: 40, name: "Cultural Integration", icon: "mdi:earth" },
      { id: 28, name: "Environment", icon: "mdi:leaf" },
      { id: 27, name: "Media", icon: "mdi:play-network" },
      { id: 37, name: "Mythology", icon: "mdi:auto-fix" },
      { id: 38, name: "Holidays", icon: "mdi:party-popper" },
    ],
  },
  {
    name: "PROFESSIONAL",
    icon: "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" fill-opacity=\"0\" stroke=\"currentColor\" stroke-dasharray=\"64\" stroke-dashoffset=\"64\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M12 2l-9 3.5v6.5c0 3.5 3.5 9 8 10c4.5 -1 8 -6.5 8 -10v-6.5l-8 -3.5Z\"><animate fill=\"freeze\" attributeName=\"fill-opacity\" begin=\"0.7s\" dur=\"0.15s\" values=\"0;0.3\"/><animate fill=\"freeze\" attributeName=\"stroke-dashoffset\" dur=\"0.6s\" values=\"64;0\"/></path></svg>",
    topics: [
      { id: 30, name: "Common Collocations", icon: "mdi:arrow-collapse-all" },
      { id: 31, name: "Modern Expressions", icon: "mdi:pound" },
      { id: 39, name: "Formal Language", icon: "mdi:script-text" },
      { id: 41, name: "Verbs", icon: "mdi:run" },
      { id: 42, name: "Daily Language", icon: "mdi:forum" },
      { id: 43, name: "Essential Words", icon: "mdi:star" },
      { id: 45, name: "Example Sentences", icon: "mdi:format-quote-close" },
    ],
  },
  {
    name: "MY WORDS",
    icon: "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M3 3v18h18V3zm16 16H5V5h14zm-7-2h5v-2h-5zm0-4h5V9h-5zm-6 4h4v-6H6zm0-8h10V7H6z\"/></svg>",
    topics: [

    ],
  },
]
