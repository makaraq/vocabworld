# Batch 2: Last 25 languages
# Run this in Window 2

Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  BATCH 2: Languages 26-50" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""

$languages = @(
    'bg', 'sr', 'hr', 'sk', 'sl', 'et', 'lv', 'lt', 'sq', 'ca',
    'eu', 'is', 'ga', 'cy', 'mt', 'he', 'th', 'vi', 'id', 'ms',
    'tl', 'sw', 'af', 'zu', 'xh'
)

Write-Host "📊 Batch 2 languages: $($languages.Count)" -ForegroundColor Magenta
Write-Host "⏱️  Estimated time: 4-6 hours" -ForegroundColor Yellow
Write-Host ""

$startTime = Get-Date
$completedCount = 0

foreach ($lang in $languages) {
    $completedCount++
    $elapsed = (Get-Date) - $startTime
    $avgTimePerLang = if ($completedCount -gt 1) { $elapsed.TotalMinutes / ($completedCount - 1) } else { 12 }
    $remaining = ($languages.Count - $completedCount) * $avgTimePerLang
    
    Write-Host "[$completedCount/$($languages.Count)] 🤖 BATCH 2: Processing $lang..." -ForegroundColor Magenta
    Write-Host "⏱️  Elapsed: $([math]::Floor($elapsed.TotalMinutes))m | ETA: $([math]::Floor($remaining))m" -ForegroundColor Yellow
    Write-Host ""
    
    npx tsx scripts/generate-phonetics-gemini.ts --language=$lang
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error processing $lang" -ForegroundColor Red
    } else {
        Write-Host "✅ Completed $lang" -ForegroundColor Green
    }
    Write-Host ""
}

$totalTime = (Get-Date) - $startTime

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  🎉 BATCH 2 COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "⏱️  Time: $([math]::Floor($totalTime.TotalHours))h $($totalTime.Minutes)m" -ForegroundColor Magenta
