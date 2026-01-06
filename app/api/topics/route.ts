import { NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

export async function GET() {
  try {
    console.log('🔍 Topics API called')
    console.log('📁 Process cwd:', process.cwd())
    
    // Primary path for local and most deployments
    const primaryPath = join(process.cwd(), 'public', 'data', 'topics.json')
    console.log('🔍 Trying primary path:', primaryPath)
    
    if (existsSync(primaryPath)) {
      const topicsData = readFileSync(primaryPath, 'utf8')
      const topics = JSON.parse(topicsData)
      console.log('✅ Topics loaded successfully from primary path. Count:', topics.length)
      return NextResponse.json(topics)
    }
    
    // Alternative paths for different deployment environments
    const altPaths = [
      join(process.cwd(), 'app', 'api', 'topics', '../../../public/data/topics.json'),
      join(__dirname, '../../../public/data/topics.json'),
      join(process.cwd(), '.next', 'server', 'app', 'api', 'topics', '../../../public/data/topics.json')
    ]
    
    for (const altPath of altPaths) {
      console.log('🔍 Trying alternative path:', altPath)
      if (existsSync(altPath)) {
        const topicsData = readFileSync(altPath, 'utf8')
        const topics = JSON.parse(topicsData)
        console.log('✅ Topics loaded successfully from alternative path. Count:', topics.length)
        return NextResponse.json(topics)
      }
    }
    
    console.error('❌ Could not find topics.json in any expected location')
    return NextResponse.json({ error: 'Topics file not found' }, { status: 404 })
    
  } catch (error) {
    console.error('❌ Error in topics API:', error)
    return NextResponse.json({ error: 'Failed to load topics' }, { status: 500 })
  }
}