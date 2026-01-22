# Generate phonetics for ALL 50 languages using Gemini
# Processes sequentially to respect API rate limits

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Gemini Phonetics Generator (All Languages)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$languages = @(
    'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko',
    'ar', 'hi', 'bn', 'tr', 'nl', 'pl', 'sv', 'no', 'da', 'fi',
    'el', 'cs', 'hu', 'ro', 'uk', 'bg', 'sr', 'hr', 'sk', 'sl',
    'et', 'lv', 'lt', 'sq', 'ca', 'eu', 'is', 'ga', 'cy', 'mt',
    'he', 'th', 'vi', 'id', 'ms', 'tl', 'sw', 'af', 'zu', 'xh'
)

Write-Host "📊 Total languages: $($languages.Count)" -ForegroundColor Cyan
Write-Host "⏱️  Estimated time: 10-15 hours" -ForegroundColor Yellow
Write-Host ""

$startTime = Get-Date
$completedCount = 0

foreach ($lang in $languages) {
    $completedCount++
    $elapsed = (Get-Date) - $startTime
    $avgTimePerLang = if ($completedCount -gt 1) { $elapsed.TotalMinutes / ($completedCount - 1) } else { 15 }
    $remaining = ($languages.Count - $completedCount) * $avgTimePerLang
    
    Write-Host "[$completedCount/$($languages.Count)] 🤖 Processing $lang..." -ForegroundColor Cyan
    Write-Host "⏱️  Elapsed: $([math]::Floor($elapsed.TotalMinutes))m | ETA: $([math]::Floor($remaining))m remaining" -ForegroundColor Yellow
    Write-Host ""
    
    npx tsx scripts/generate-phonetics-gemini.ts --language=$lang
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error processing $lang" -ForegroundColor Red
    } else {
        Write-Host "✅ Completed $lang" -ForegroundColor Green
    }
    Write-Host ""
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Write-Host ""
}

$totalTime = (Get-Date) - $startTime

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  🎉 ALL LANGUAGES COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "⏱️  Total time: $([math]::Floor($totalTime.TotalHours))h $($totalTime.Minutes)m" -ForegroundColor Cyan
Write-Host "📊 Languages processed: $($languages.Count)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Verify results with:" -ForegroundColor Yellow
Write-Host "  npx tsx scripts/check-all-languages.ts" -ForegroundColor White
