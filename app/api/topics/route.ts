import { NextResponse } from 'next/server'

// Import topics data directly instead of reading file at runtime
import topicsData from '../../../public/data/topics.json'

export async function GET() {
  try {
    console.log('🔍 Topics API called')
    console.log('📊 Topics data loaded:', Object.keys(topicsData).length)
    
    return NextResponse.json(topicsData)
  } catch (error) {
    console.error('❌ Error loading topics:', error)
    return NextResponse.json({ error: 'Failed to load topics' }, { status: 500 })
  }
}