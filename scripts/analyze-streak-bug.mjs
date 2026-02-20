/**
 * Day Streak Bug Analysis & Testing
 * Tests the current streak calculation logic to identify issues
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('\n' + '='.repeat(70));
console.log('🐛 DAY STREAK BUG ANALYSIS');
console.log('='.repeat(70));

console.log('\n📊 CURRENT IMPLEMENTATION BUGS:\n');

console.log('BUG #1: TIMEZONE ISSUES');
console.log('-------');
console.log('❌ Problem: Uses UTC dates without user timezone consideration');
console.log('   Code: new Date().toISOString().split("T")[0]');
console.log('   Impact: User in PST could log in twice on same calendar day');
console.log('          and streak won\'t increment because both are same UTC date.');
console.log('');
console.log('   Example scenario (User in PST, UTC-8):');
console.log('   - Feb 17 11:00 PM PST → Feb 18 07:00 UTC → stored as "2026-02-18"');
console.log('   - Feb 18 01:00 AM PST → Feb 18 09:00 UTC → stored as "2026-02-18"');
console.log('   - Result: No streak increment despite logging in 2 different days!');
console.log('');

console.log('BUG #2: DATE CALCULATION PRECISION');
console.log('-------');
console.log('❌ Problem: Uses Math.floor for day difference calculation');
console.log('   Code: Math.floor(diffTime / (1000 * 60 * 60 * 24))');
console.log('   Impact: 23h 59m = 0 days, 24h 1m = 1 day');
console.log('   Could break streaks during daylight saving time changes');
console.log('');

console.log('BUG #3: NO CONSIDERATION FOR USER LEAVING AND RETURNING');
console.log('-------');
console.log('❌ Problem: Streak only updates on login/session initialization');
console.log('   Impact: User could leave app open for days and streak freezes');
console.log('   The app should check/update streak periodically or on focus');
console.log('');

console.log('BUG #4: SAME-DAY CHECK PREVENTS CORRECTION');
console.log('-------');
console.log('❌ Problem: if (existing.last_login_date === today) return;');
console.log('   Impact: If timezone bug occurs, user cannot fix it same day');
console.log('   Missing logins cannot be backfilled or corrected');
console.log('');

console.log('\n💡 RECOMMENDED FIXES:\n');

console.log('FIX #1: Use Calendar Days in User Timezone');
console.log('-------');
console.log('✅ Store last_login_date as user\'s local calendar date');
console.log('✅ Pass timezone from client to server');
console.log('✅ Calculate "today" in user\'s timezone, not UTC');
console.log('');
console.log('   Example implementation:');
console.log('   const userToday = new Date().toLocaleDateString("en-CA", {');
console.log('     timeZone: userTimezone // e.g., "America/Los_Angeles"');
console.log('   }); // Returns "YYYY-MM-DD" in user\'s timezone');
console.log('');

console.log('FIX #2: Calendar Day Difference (Not Time Difference)');
console.log('-------');
console.log('✅ Calculate day difference using date objects, not timestamps');
console.log('');
console.log('   Example:');
console.log('   function daysBetween(date1: string, date2: string): number {');
console.log('     const d1 = new Date(date1 + "T00:00:00");');
console.log('     const d2 = new Date(date2 + "T00:00:00");');
console.log('     const diffTime = d2.getTime() - d1.getTime();');
console.log('     return Math.round(diffTime / (1000 * 60 * 60 * 24));');
console.log('   }');
console.log('');

console.log('FIX #3: Add Streak Check on App Focus');
console.log('-------');
console.log('✅ Update streak when app regains focus, not just on login');
console.log('✅ Add visibility change listener in main app component');
console.log('');

console.log('FIX #4: Add Grace Period (Optional but Recommended)');
console.log('-------');
console.log('✅ Many apps give 1-day grace period before breaking streak');
console.log('✅ if (diffDays <= 2) newStreak++; // Allows missed day');
console.log('');

console.log('\n🔍 CHECKING CURRENT DATABASE STATE:\n');

async function analyzeDatabaseState() {
  try {
    // Get all streak records
    const { data: streaks, error } = await supabase
      .from('user_login_streaks')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching streaks:', error);
      return;
    }

    if (!streaks || streaks.length === 0) {
      console.log('⚠️  No streak records found in database');
      return;
    }

    console.log(`Found ${streaks.length} streak record(s):\n`);

    const now = new Date();
    const utcToday = now.toISOString().split('T')[0];

    streaks.forEach((streak, i) => {
      console.log(`${i + 1}. User: ${streak.user_id.substring(0, 8)}...`);
      console.log(`   Current Streak: ${streak.current_streak} days`);
      console.log(`   Longest Streak: ${streak.longest_streak} days`);
      console.log(`   Last Login (UTC): ${streak.last_login_date}`);
      console.log(`   UTC Today: ${utcToday}`);
      
      // Check if dates match
      if (streak.last_login_date === utcToday) {
        console.log(`   ✅ User already logged in today (UTC)`);
      } else {
        const lastDate = new Date(streak.last_login_date);
        const currentDate = new Date(utcToday);
        const diffTime = currentDate.getTime() - lastDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        console.log(`   ⏰ Days since last login (UTC): ${diffDays}`);
        
        if (diffDays === 1) {
          console.log(`   📅 Would increment streak to ${streak.current_streak + 1}`);
        } else if (diffDays > 1) {
          console.log(`   ❌ Streak broken! Would reset to 1`);
        }
      }
      console.log('');
    });

    // Test timezone impact
    console.log('\n🌍 TIMEZONE IMPACT SIMULATION:\n');
    console.log('Current UTC time: ' + now.toISOString());
    console.log('UTC Date: ' + utcToday);
    console.log('');
    console.log('Same moment in different timezones:');
    
    const timezones = [
      'America/Los_Angeles',  // PST/PDT
      'America/New_York',     // EST/EDT
      'Europe/London',        // GMT/BST
      'Asia/Tokyo',           // JST
      'Australia/Sydney'      // AEST/AEDT
    ];

    timezones.forEach(tz => {
      const localDate = now.toLocaleDateString('en-CA', { timeZone: tz });
      const matches = localDate === utcToday ? '✅ Same' : '❌ DIFFERENT';
      console.log(`  ${tz.padEnd(25)} ${localDate} ${matches}`);
    });

    console.log('\n⚠️  Users in different timezones see different calendar dates!');
    console.log('   This causes inconsistent streak behavior.');

  } catch (error) {
    console.error('Analysis error:', error);
  }
}

async function testStreakLogic() {
  console.log('\n\n🧪 TESTING STREAK CALCULATION LOGIC:\n');

  const testCases = [
    {
      name: 'Consecutive days',
      lastLogin: '2026-02-17',
      currentLogin: '2026-02-18',
      currentStreak: 5,
      expected: 6
    },
    {
      name: 'Same day (no change)',
      lastLogin: '2026-02-18',
      currentLogin: '2026-02-18',
      currentStreak: 5,
      expected: 5
    },
    {
      name: 'Missed one day (streak broken)',
      lastLogin: '2026-02-16',
      currentLogin: '2026-02-18',
      currentStreak: 10,
      expected: 1
    },
    {
      name: 'Edge case: 23 hours 59 minutes apart',
      lastLogin: '2026-02-17',
      currentLogin: '2026-02-18', // But less than 24h
      currentStreak: 3,
      expected: 4,
      note: 'Uses date strings so should work, but time-based calc would fail'
    }
  ];

  testCases.forEach(test => {
    const lastDate = new Date(test.lastLogin);
    const currentDate = new Date(test.currentLogin);
    const diffTime = currentDate.getTime() - lastDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    let actual;
    if (test.lastLogin === test.currentLogin) {
      actual = test.currentStreak; // No change
    } else if (diffDays === 1) {
      actual = test.currentStreak + 1;
    } else if (diffDays > 1) {
      actual = 1;
    } else {
      actual = test.currentStreak;
    }

    const pass = actual === test.expected ? '✅' : '❌';
    console.log(`${pass} ${test.name}`);
    console.log(`   Last: ${test.lastLogin}, Current: ${test.currentLogin}`);
    console.log(`   Diff: ${diffDays} days`);
    console.log(`   Current streak: ${test.currentStreak} → Expected: ${test.expected}, Got: ${actual}`);
    if (test.note) console.log(`   Note: ${test.note}`);
    console.log('');
  });
}

async function main() {
  await analyzeDatabaseState();
  await testStreakLogic();

  console.log('\n' + '='.repeat(70));
  console.log('📝 SUMMARY');
  console.log('='.repeat(70));
  console.log('\nThe streak system has critical timezone bugs that can:');
  console.log('  1. Prevent streaks from incrementing when user logs in daily');
  console.log('  2. Break streaks incorrectly due to timezone differences');
  console.log('  3. Show inconsistent behavior across different regions');
  console.log('\nRecommended: Implement timezone-aware date handling.');
  console.log('See fixes above for implementation details.');
  console.log('\n' + '='.repeat(70) + '\n');
}

main().catch(console.error);
