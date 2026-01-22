# Batch 1: First 25 languages
# Run this in Window 1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BATCH 1: Languages 1-25" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$languages = @(
    'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko',
    'ar', 'hi', 'bn', 'tr', 'nl', 'pl', 'sv', 'no', 'da', 'fi',
    'el', 'cs', 'hu', 'ro', 'uk'
)

Write-Host "📊 Batch 1 languages: $($languages.Count)" -ForegroundColor Cyan
Write-Host "⏱️  Estimated time: 4-6 hours" -ForegroundColor Yellow
Write-Host ""

$startTime = Get-Date
$completedCount = 0

foreach ($lang in $languages) {
    $completedCount++
    $elapsed = (Get-Date) - $startTime
    $avgTimePerLang = if ($completedCount -gt 1) { $elapsed.TotalMinutes / ($completedCount - 1) } else { 12 }
    $remaining = ($languages.Count - $completedCount) * $avgTimePerLang
    
    Write-Host "[$completedCount/$($languages.Count)] 🤖 BATCH 1: Processing $lang..." -ForegroundColor Cyan
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
Write-Host "  🎉 BATCH 1 COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "⏱️  Time: $([math]::Floor($totalTime.TotalHours))h $($totalTime.Minutes)m" -ForegroundColor Cyan
