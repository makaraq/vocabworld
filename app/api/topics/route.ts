import { NextResponse } from 'next/server'

// Embedded topics data - exact copy from topics.json to ensure production matches local
const TOPICS_DATA = [
  {
    "id": 1,
    "name": "Greetings",
    "description": "Essential greetings and social interactions",
    "icon": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"40\" height=\"40\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M1.5 4v1.5c0 4.15 2.21 7.78 5.5 9.8V20h15v-2c0-2.66-5.33-4-8-4h-.25C9 14 5 10 5 5.5V4m9 0a4 4 0 0 0-4 4a4 4 0 0 0 4 4a4 4 0 0 0 4-4a4 4 0 0 0-4-4\"/></svg>"
  },
  {
    "id": 2,
    "name": "Numbers",
    "description": "Numbers, quantities, and ordinal expressions",
    "icon": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"40\" height=\"40\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2m0 2v12h7V6zm16 12V6h-1.24c.24.54.19 1.07.19 1.13c-.07.67-.54 1.37-.71 1.62l-2.33 2.55l3.32-.02l.01 1.22l-5.2-.03l-.04-1s3.05-3.23 3.2-3.52c.14-.28.71-1.95-.7-1.95c-1.23.05-1.09 1.3-1.09 1.3l-1.54.01s.01-.66.38-1.31H13v12h2.58l-.01-.86l.97-.01s.91-.16.92-1.05c.04-1-.81-1-.96-1c-.13 0-1.07.05-1.07.87h-1.52s.04-2.06 2.59-2.06c2.6 0 2.46 2.02 2.46 2.02s.04 1.25-1.11 1.72l.52.37zM8.92 16h-1.5v-5.8l-1.8.56V9.53l3.14-1.12h.16z\"/></svg>"
  },
  {
    "id": 3,
    "name": "Time",
    "description": "Time expressions, dates, days, months, and seasons",
    "icon": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"40\" height=\"40\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M6 2h12v6l-4 4l4 4v6H6v-6l4-4l-4-4zm10 14.5l-4-4l-4 4V20h8zm-4-5l4-4V4H8v3.5zM10 6h4v.75l-2 2l-2-2z\"/></svg>"
  },
  {
    "id": 7,
    "name": "Emergency",
    "description": "Emergency situations and safety vocabulary",
    "icon": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"40\" height=\"40\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M11 15h2v2h-2zm0-8h2v6h-2zm1-4a9 9 0 0 0-9 9a9 9 0 0 0 9 9a9 9 0 0 0 9-9a9 9 0 0 0-9-9m0 16c-3.86 0-7-3.14-7-7s3.14-7 7-7s7 3.14 7 7s-3.14 7-7 7m8.5 1.5c2.16-2.19 3.5-5.19 3.5-8.5s-1.34-6.31-3.5-8.5l-1.08 1.08C21.32 6.5 22.5 9.11 22.5 12c0 2.9-1.18 5.5-3.08 7.42zM4.58 19.42C2.68 17.5 1.5 14.9 1.5 12c0-2.89 1.18-5.5 3.08-7.42L3.5 3.5C1.34 5.69 0 8.69 0 12s1.34 6.31 3.5 8.5z\"/></svg>"
  },
  {
    "id": 4,
    "name": "Directions",
    "description": "Navigation, travel, and transportation vocabulary",
    "icon": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"40\" height=\"40\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M11 5H8l4-4l4 4h-3v4.43c-.75.46-1.42 1.03-2 1.69zm11 6l-4-4v3a6.747 6.747 0 0 0-7 6.17A3.006 3.006 0 0 0 9.17 20A3.006 3.006 0 0 0 13 21.83A3.01 3.01 0 0 0 14.83 18c-.3-.86-.98-1.53-1.83-1.83c.47-4 4.47-4.2 4.95-4.2v3zm-11.37.59A7.63 7.63 0 0 0 6 10V7l-4 4l4 4v-3c1.34.03 2.63.5 3.64 1.4c.25-.64.58-1.25.99-1.81\"/></svg>"
  },
  {
    "id": 18,
    "name": "Travel",
    "description": "Travel, tourism, and vacation vocabulary",
    "icon": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"40\" height=\"40\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M11 6h2V4h-2zm1 6q-1.9 0-3.625-.788T5 9.45V8q0-.825.588-1.412T7 6h2V3q0-.425.288-.712T10 2h4q.425 0 .713.288T15 3v3h2q.825 0 1.413.588T19 8v1.45q-1.65.975-3.375 1.763T12 12m-5 9q-.825 0-1.412-.587T5 19v-7.3q1.4.85 2.888 1.45t3.112.8V14q0 .425.288.713T12 15t.713-.288T13 14v-.05q1.625-.2 3.113-.8T19 11.7V19q0 .825-.587 1.413T17 21q0 .425-.288.713T16 22q-.4 0-.562-.363T15 21H9q0 .425-.288.713T8 22q-.4 0-.562-.363T7 21\"/></svg>"
  },
  {
    "id": 5,
    "name": "Shopping",
    "description": "Shopping, money, and commercial transactions"
  },
  {
    "id": 6,
    "name": "Food",
    "description": "Food, beverages, and dining experiences",
    "icon": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"40\" height=\"40\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M22 3L10 4.41V6h12v1H10v5h12c0 1.81-.57 3.46-1.68 4.95s-2.55 2.58-4.32 3.3V22H8v-1.75c-1.76-.72-3.21-1.82-4.32-3.3S2 13.81 2 12h3V4l17-2zM6 4.88V6h1V4.78zM6 7v5h1V7zm3 5V7H8v5zm0-6V4.55l-1 .09V6z\"/></svg>"
  },
  {
    "id": 9,
    "name": "Home",
    "description": "Home, furniture, and household vocabulary"
  },
  {
    "id": 17,
    "name": "Places Around Town",
    "description": "Urban locations and city places"
  },
  {
    "id": 12,
    "name": "Family & Relationships",
    "description": "Family members and relationship vocabulary",
    "icon": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"40\" height=\"40\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M12 1a2.5 2.5 0 0 0-2.5 2.5A2.5 2.5 0 0 0 11 5.79V7H7a2 2 0 0 0-2 2v.71A2.5 2.5 0 0 0 3.5 12A2.5 2.5 0 0 0 5 14.29V15H4a2 2 0 0 0-2 2v1.21A2.5 2.5 0 0 0 .5 20.5A2.5 2.5 0 0 0 3 23a2.5 2.5 0 0 0 2.5-2.5A2.5 2.5 0 0 0 4 18.21V17h4v1.21a2.5 2.5 0 0 0-1.5 2.29A2.5 2.5 0 0 0 9 23a2.5 2.5 0 0 0 2.5-2.5a2.5 2.5 0 0 0-1.5-2.29V17a2 2 0 0 0-2-2H7v-.71A2.5 2.5 0 0 0 8.5 12A2.5 2.5 0 0 0 7 9.71V9h10v.71A2.5 2.5 0 0 0 15.5 12a2.5 2.5 0 0 0 1.5 2.29V15h-1a2 2 0 0 0-2 2v1.21a2.5 2.5 0 0 0-1.5 2.29A2.5 2.5 0 0 0 15 23a2.5 2.5 0 0 0 2.5-2.5a2.5 2.5 0 0 0-1.5-2.29V17h4v1.21a2.5 2.5 0 0 0-1.5 2.29A2.5 2.5 0 0 0 21 23a2.5 2.5 0 0 0 2.5-2.5a2.5 2.5 0 0 0-1.5-2.29V17a2 2 0 0 0-2-2h-1v-.71A2.5 2.5 0 0 0 20.5 12A2.5 2.5 0 0 0 19 9.71V9a2 2 0 0 0-2-2h-4V5.79a2.5 2.5 0 0 0 1.5-2.29A2.5 2.5 0 0 0 12 1m0 1.5a1 1 0 0 1 1 1a1 1 0 0 1-1 1a1 1 0 0 1-1-1a1 1 0 0 1 1-1M6 11a1 1 0 0 1 1 1a1 1 0 0 1-1 1a1 1 0 0 1-1-1a1 1 0 0 1 1-1m12 0a1 1 0 0 1 1 1a1 1 0 0 1-1 1a1 1 0 0 1-1-1a1 1 0 0 1 1-1M3 19.5a1 1 0 0 1 1 1a1 1 0 0 1-1 1a1 1 0 0 1-1-1a1 1 0 0 1 1-1m6 0a1 1 0 0 1 1 1a1 1 0 0 1-1 1a1 1 0 0 1-1-1a1 1 0 0 1 1-1m6 0a1 1 0 0 1 1 1a1 1 0 0 1-1 1a1 1 0 0 1-1-1a1 1 0 0 1 1-1m6 0a1 1 0 0 1 1 1a1 1 0 0 1-1 1a1 1 0 0 1-1-1a1 1 0 0 1 1-1\"/></svg>"
  },
  {
    "id": 8,
    "name": "Health & Body Parts",
    "description": "Health, medical terms, and body parts",
    "icon": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"40\" height=\"40\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M18 14h-4v4h-4v-4H6v-4h4V6h4v4h4m2-8H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2m0 18H4V4h16z\"/></svg>"
  },
  {
    "id": 11,
    "name": "Weather & Nature",
    "description": "Weather conditions, natural environments, and geographic features",
    "icon": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"40\" height=\"40\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M12.74 5.47c2.36 1.03 3.61 3.56 3.18 5.99A6 6 0 0 1 18 16v.17a3 3 0 0 1 1-.17a3 3 0 0 1 3 3a3 3 0 0 1-3 3H6a4 4 0 0 1-4-4a4 4 0 0 1 4-4h.27C5 12.45 4.6 10.24 5.5 8.26a5.49 5.49 0 0 1 7.24-2.79m-.81 1.83c-1.77-.8-3.84.01-4.62 1.77c-.46 1.02-.38 2.15.1 3.06A5.99 5.99 0 0 1 12 10c.7 0 1.38.12 2 .34a3.51 3.51 0 0 0-2.07-3.04m1.62-3.66c-.55-.24-1.1-.41-1.67-.52l2.49-1.3l.9 2.89a7.7 7.7 0 0 0-1.72-1.07m-7.46.8c-.49.35-.92.75-1.29 1.19l.11-2.81l2.96.68c-.62.21-1.22.53-1.78.94M18 9.71c-.09-.59-.22-1.16-.41-1.71l2.38 1.5l-2.05 2.23c.11-.65.13-1.33.08-2.02M3.04 11.3c.07.6.2 1.17.39 1.7l-2.37-1.5L3.1 9.28c-.1.65-.13 1.33-.06 2.02M19 18h-3v-2a4 4 0 0 0-4-4a4 4 0 0 0-4 4H6a2 2 0 0 0-2 2a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1a1 1 0 0 0-1-1\"/></svg>"
  },
  {
    "id": 10,
    "name": "Personal Style",
    "description": "Clothing, accessories, and personal style",
    "icon": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"40\" height=\"40\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M12 4a3.5 3.5 0 0 0-3.5 3.5h2A1.5 1.5 0 0 1 12 6a1.5 1.5 0 0 1 1.5 1.5A1.5 1.5 0 0 1 12 9c-.55 0-1 .45-1 1v1.75L2.4 18.2A1 1 0 0 0 3 20h18a1 1 0 0 0 .6-1.8L13 11.75v-.9a3.5 3.5 0 0 0 2.5-3.35A3.5 3.5 0 0 0 12 4m0 9.5l6 4.5H6Z\"/></svg>"
  },
  {
    "id": 13,
    "name": "Emotions",
    "description": "Emotional expressions and feelings"
  },
  {
    "id": 14,
    "name": "Personality",
    "description": "Personality traits and character descriptions"
  },
  {
    "id": 21,
    "name": "Actions",
    "description": "Common verbs and action vocabulary",
    "icon": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"40\" height=\"40\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M11 9.47V11h3.76L13 14.53V13H9.24zM13 1L6 15h5v8l7-14h-5z\"/></svg>"
  },
  {
    "id": 15,
    "name": "Hobbies",
    "description": "Recreational activities and leisure pursuits"
  },
  {
    "id": 16,
    "name": "Fitness",
    "description": "Sports, exercise, and fitness vocabulary"
  },
  {
    "id": 22,
    "name": "Adjectives",
    "description": "Descriptive words and qualifiers"
  },
  {
    "id": 25,
    "name": "Professions",
    "description": "Career, work, and professional vocabulary"
  },
  {
    "id": 26,
    "name": "Education",
    "description": "Academic and educational vocabulary",
    "icon": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"40\" height=\"40\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9zm6.82 6L12 12.72L5.18 9L12 5.28zM17 16l-5 2.72L7 16v-3.73L12 15l5-2.73z\"/></svg>"
  },
  {
    "id": 34,
    "name": "History",
    "description": "Historical and cultural vocabulary",
    "icon": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"40\" height=\"40\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M6 5h12a1 1 0 0 1 1 1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1a1 1 0 0 1 1-1m15-3v2H3V2zm-6 6h2v14h-2zM7 8h2v14H7zm4 0h2v14h-2z\"/></svg>"
  },
  {
    "id": 32,
    "name": "Science",
    "description": "Scientific and technological terminology"
  },
  {
    "id": 24,
    "name": "Technology",
    "description": "Technology, devices, and digital vocabulary"
  },
  {
    "id": 23,
    "name": "Art",
    "description": "Creative arts and entertainment vocabulary"
  },
  {
    "id": 33,
    "name": "Mathematics",
    "description": "Mathematical and geometric vocabulary"
  },
  {
    "id": 19,
    "name": "Colors & Shapes",
    "description": "Colors, shapes, and visual descriptions",
    "icon": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"40\" height=\"40\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M17.5 12a1.5 1.5 0 0 1-1.5-1.5A1.5 1.5 0 0 1 17.5 9a1.5 1.5 0 0 1 1.5 1.5a1.5 1.5 0 0 1-1.5 1.5m-3-4A1.5 1.5 0 0 1 13 6.5A1.5 1.5 0 0 1 14.5 5A1.5 1.5 0 0 1 16 6.5A1.5 1.5 0 0 1 14.5 8m-5 0A1.5 1.5 0 0 1 8 6.5A1.5 1.5 0 0 1 9.5 5A1.5 1.5 0 0 1 11 6.5A1.5 1.5 0 0 1 9.5 8m-3 4A1.5 1.5 0 0 1 5 10.5A1.5 1.5 0 0 1 6.5 9A1.5 1.5 0 0 1 8 10.5A1.5 1.5 0 0 1 6.5 12M12 3a9 9 0 0 0-9 9a9 9 0 0 0 9 9a1.5 1.5 0 0 0 1.5-1.5c0-.39-.15-.74-.39-1c-.23-.27-.38-.62-.38-1a1.5 1.5 0 0 1 1.5-1.5H16a5 5 0 0 0 5-5c0-4.42-4.03-8-9-8\"/></svg>"
  },
  {
    "id": 29,
    "name": "Business",
    "description": "Business, finance, and economic vocabulary",
    "icon": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"40\" height=\"40\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M21.71 8.71c1.25-1.25.68-2.71 0-3.42l-3-3c-1.26-1.25-2.71-.68-3.42 0L13.59 4H11C9.1 4 8 5 7.44 6.15L3 10.59v4l-.71.7c-1.25 1.26-.68 2.71 0 3.42l3 3c.54.54 1.12.74 1.67.74c.71 0 1.36-.35 1.75-.74l2.7-2.71H15c1.7 0 2.56-1.06 2.87-2.1c1.13-.3 1.75-1.16 2-2C21.42 14.5 22 13.03 22 12V9h-.59zM20 12c0 .45-.19 1-1 1h-1v1c0 .45-.19 1-1 1h-1v1c0 .45-.19 1-1 1h-4.41l-3.28 3.28c-.31.29-.49.12-.6.01l-2.99-2.98c-.29-.31-.12-.49-.01-.6L5 15.41v-4l2-2V11c0 1.21.8 3 3 3s3-1.79 3-3h7zm.29-4.71L18.59 9H11v2c0 .45-.19 1-1 1s-1-.55-1-1V8c0-.46.17-2 2-2h3.41l2.28-2.28c.31-.29.49-.12.6-.01l2.99 2.98c.29.31.12.49.01.6\"/></svg>"
  },
  {
    "id": 35,
    "name": "Politics & Law",
    "description": "Political and legal terminology",
    "icon": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"40\" height=\"40\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M12 3c-1.27 0-2.4.8-2.82 2H3v2h1.95L2 14c-.47 2 1 3 3.5 3s4.06-1 3.5-3L6.05 7h3.12c.33.85.98 1.5 1.83 1.83V20H2v2h20v-2h-9V8.82c.85-.32 1.5-.97 1.82-1.82h3.13L15 14c-.47 2 1 3 3.5 3s4.06-1 3.5-3l-2.95-7H21V5h-6.17C14.4 3.8 13.27 3 12 3m0 2a1 1 0 0 1 1 1a1 1 0 0 1-1 1a1 1 0 0 1-1-1a1 1 0 0 1 1-1m-6.5 5.25L7 14H4zm13 0L20 14h-3z\"/></svg>"
  },
  {
    "id": 36,
    "name": "Religion",
    "description": "Religious and philosophical concepts"
  },
  {
    "id": 40,
    "name": "Cultural Integration",
    "description": "Cultural awareness and global concepts"
  },
  {
    "id": 28,
    "name": "Environment",
    "description": "Environmental and sustainability topics"
  },
  {
    "id": 27,
    "name": "Media",
    "description": "Communication methods and media vocabulary",
    "icon": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"40\" height=\"40\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M15 20a1 1 0 0 0-1-1h-1v-2h4a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4v2h-1a1 1 0 0 0-1 1H2v2h7a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1h7v-2zm-5-6V6l5 4z\"/></svg>"
  },
  {
    "id": 37,
    "name": "Mythology",
    "description": "Mythological and fantasy vocabulary"
  },
  {
    "id": 38,
    "name": "Holidays",
    "description": "Holidays, celebrations, and festive vocabulary"
  },
  {
    "id": 30,
    "name": "Common Collocations",
    "description": "Frequent word combinations and phrases",
    "icon": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"40\" height=\"40\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"m19.5 3.09l1.41 1.41l-4.5 4.5H20v2h-7V4h2v3.59zm1.41 16.41l-1.41 1.41l-4.5-4.5V20h-2v-7h7v2h-3.59zM4.5 3.09L9 7.59V4h2v7H4V9h3.59l-4.5-4.5zM3.09 19.5l4.5-4.5H4v-2h7v7H9v-3.59l-4.5 4.5z\"/></svg>"
  },
  {
    "id": 31,
    "name": "Modern Expressions",
    "description": "Contemporary slang and informal expressions"
  },
  {
    "id": 39,
    "name": "Formal Language",
    "description": "Formal and advanced communication"
  },
  {
    "id": 41,
    "name": "Verbs",
    "description": "Common action verbs for everyday communication"
  },
  {
    "id": 42,
    "name": "Daily Language",
    "description": "Essential everyday phrases and expressions",
    "icon": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"40\" height=\"40\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M12 3C6.5 3 2 6.58 2 11a7.77 7.77 0 0 0 2.75 5.74L2 21.5l5.36-2.05A11.2 11.2 0 0 0 12 21c5.5 0 10-4.58 10-10S17.5 3 12 3m-1 14H9v-2h2zm0-3H9a3 3 0 0 1 3-3V9a5 5 0 0 0-5 5H5a7 7 0 0 1 7-7v2a5 5 0 0 0-5 5h2a3 3 0 0 1 3-3zm3 3h-2v-2h2zm0-3h-2a5 5 0 0 1 5-5v2a3 3 0 0 0-3 3\"/></svg>"
  },
  {
    "id": 43,
    "name": "Essential Words",
    "description": "Essential grammar words and structures",
    "icon": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"40\" height=\"40\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M14.6 16.6l4.6-4.6l-4.6-4.6L16 6l6 6l-6 6zM9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6l6 6z\"/></svg>"
  },
  {
    "id": 44,
    "name": "Bad Words",
    "description": "Profanity and offensive language",
    "icon": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"40\" height=\"40\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10s10-4.5 10-10S17.5 2 12 2m0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8s8 3.59 8 8s-3.59 8-8 8m3.59-13L12 10.59L8.41 7L7 8.41L10.59 12L7 15.59L8.41 17L12 13.41L15.59 17L17 15.59L13.41 12L17 8.41z\"/></svg>"
  },
  {
    "id": 45,
    "name": "Example Sentences",
    "description": "Common phrases and sentences for everyday conversations",
    "icon": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"40\" height=\"40\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V4c0-1.1-.9-2-2-2m-2 12H6v-2h12zm0-3H6V9h12zm0-3H6V6h12z\"/></svg>"
  }
]

export async function GET() {
  try {
    console.log('✅ Topics API: Serving embedded topics data')
    console.log('📊 Total topics count:', TOPICS_DATA.length)
    
    return NextResponse.json(TOPICS_DATA)
  } catch (error) {
    console.error('❌ Error in topics API:', error)
    return NextResponse.json({ error: 'Failed to load topics' }, { status: 500 })
  }
}