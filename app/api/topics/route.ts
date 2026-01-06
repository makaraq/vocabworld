import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET() {
  try {
    console.log('🔍 Topics API called')
    
    // Try multiple paths for different environments
    const possiblePaths = [
      join(process.cwd(), 'public', 'data', 'topics.json'),
      join(process.cwd(), '.next', 'static', 'chunks', 'public', 'data', 'topics.json'),
      join(__dirname, '..', '..', '..', 'public', 'data', 'topics.json')
    ]
    
    let topics = null
    let lastError = null
    
    for (const topicsPath of possiblePaths) {
      try {
        console.log('🔍 Trying path:', topicsPath)
        const topicsData = readFileSync(topicsPath, 'utf8')
        topics = JSON.parse(topicsData)
        console.log('✅ Topics loaded successfully from:', topicsPath)
        break
      } catch (err) {
        console.log('❌ Failed to load from:', topicsPath, err.message)
        lastError = err
      }
    }
    
    if (!topics) {
      // Fallback: return basic topics structure if file not found
      console.log('🔄 Using fallback topics data')
      topics = {
        "1": { "id": 1, "name": "Greetings", "description": "Common greetings and polite expressions", "icon": "👋", "color": "blue", "difficulty": "beginner", "wordCount": 20 },
        "2": { "id": 2, "name": "Family", "description": "Family members and relationships", "icon": "👨‍👩‍👧‍👦", "color": "green", "difficulty": "beginner", "wordCount": 25 },
        "3": { "id": 3, "name": "Time & Dates", "description": "Time expressions and date vocabulary", "icon": "⏰", "color": "purple", "difficulty": "beginner", "wordCount": 30 }
      }
    }
    
    return NextResponse.json(topics)
    
  } catch (error) {
    console.error('❌ Error in topics API:', error)
    return NextResponse.json({ error: 'Failed to load topics' }, { status: 500 })
  }
}