# Database Setup Script for Sprind Subscription System
# This script will help you set up all the necessary tables and functions in your Supabase database

Write-Host "🚀 Setting up Sprind Subscription Database Schema..." -ForegroundColor Green

# Check if schema file exists
if (Test-Path "database-schema-subscription.sql") {
    Write-Host "📋 Found database schema file" -ForegroundColor Blue
    Write-Host ""
    Write-Host "🔧 To apply this schema:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "OPTION 1 - Supabase Dashboard (Recommended):" -ForegroundColor Cyan
    Write-Host "1. Go to https://supabase.com/dashboard" -ForegroundColor White
    Write-Host "2. Select your project: ripkorbuxnoljiprhlyk" -ForegroundColor White
    Write-Host "3. Go to SQL Editor (on the left sidebar)" -ForegroundColor White
    Write-Host "4. Create a 'New Query'" -ForegroundColor White
    Write-Host "5. Copy and paste ALL content from 'database-schema-subscription.sql'" -ForegroundColor White
    Write-Host "6. Click 'Run' to execute the SQL" -ForegroundColor White
    Write-Host ""
    Write-Host "OPTION 2 - Direct SQL execution:" -ForegroundColor Cyan
    Write-Host "Copy this file content to your clipboard now..." -ForegroundColor White
    
    # Display first few lines as preview
    Write-Host ""
    Write-Host "📄 Schema preview (first 10 lines):" -ForegroundColor Magenta
    Get-Content "database-schema-subscription.sql" | Select-Object -First 10 | ForEach-Object {
        Write-Host "   $_" -ForegroundColor Gray
    }
    Write-Host "   ..." -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "📁 Full schema file location: $(Get-Location)\database-schema-subscription.sql" -ForegroundColor White
    
    # Offer to open the file
    Write-Host ""
    $openFile = Read-Host "📖 Would you like to open the schema file now? (y/n)"
    if ($openFile -eq 'y' -or $openFile -eq 'Y') {
        Start-Process notepad.exe "database-schema-subscription.sql"
    }
    
} else {
    Write-Host "❌ database-schema-subscription.sql not found!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "After running the schema, your database will have:" -ForegroundColor Green
Write-Host "   - user_subscriptions table" -ForegroundColor White
Write-Host "   - subscription_events table" -ForegroundColor White
Write-Host "   - topic_access_rules table" -ForegroundColor White
Write-Host "   - user_access_log table" -ForegroundColor White
Write-Host "   - check_user_premium_access() function" -ForegroundColor White
Write-Host "   - check_topic_access() function" -ForegroundColor White
Write-Host "   - log_topic_access() function" -ForegroundColor White
Write-Host ""
Write-Host "Then come back here and I will help you:" -ForegroundColor Yellow
Write-Host "   1. Set up the Stripe webhook properly" -ForegroundColor White
Write-Host "   2. Test the subscription system" -ForegroundColor White
Write-Host "   3. Unlock the premium topics!" -ForegroundColor White