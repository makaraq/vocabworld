import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    console.log('🔍 Topics API called')
    const topicsPath = path.join(process.cwd(), 'public', 'data', 'topics.json')
    const topicsData = fs.readFileSync(topicsPath, 'utf8')
    const topics = JSON.parse(topicsData)
    
    return NextResponse.json(topics)
  } catch (error) {
    console.error('Error reading topics:', error)
    return NextResponse.json({ error: 'Failed to load topics' }, { status: 500 })
  }
}