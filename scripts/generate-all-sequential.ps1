# Generate phonetics for ALL languages sequentially
# Run this overnight - it will complete everything

$languages = @(
    'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko',
    'ar', 'hi', 'bn', 'tr', 'nl', 'pl', 'sv', 'no', 'da', 'fi',
    'el', 'cs', 'hu', 'ro', 'uk', 'bg', 'sr', 'hr', 'sk', 'sl',
    'et', 'lv', 'lt', 'sq', 'ca', 'eu', 'is', 'ga', 'cy', 'mt',
    'he', 'th', 'vi', 'id', 'ms', 'tl', 'sw', 'af', 'zu', 'xh'
)

$total = $languages.Count
$completed = 0

Write-Host ""
Write-Host "🌍 COMPLETE PHONETICS GENERATION" -ForegroundColor Cyan
Write-Host "=" * 80
Write-Host "Languages: $total"
Write-Host "Estimated time: 8-10 hours"
Write-Host "=" * 80
Write-Host ""

foreach ($lang in $languages) {
    $completed++
    
    Write-Host ""
    Write-Host "=" * 80 -ForegroundColor Yellow
    Write-Host "[$completed/$total] Processing: $lang" -ForegroundColor Green
    Write-Host "=" * 80 -ForegroundColor Yellow
    Write-Host ""
    
    npx tsx scripts/generate-phonetics-complete.ts --language=$lang
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $lang completed successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ $lang failed with exit code $LASTEXITCODE" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=" * 80 -ForegroundColor Green
Write-Host "🎉 ALL LANGUAGES COMPLETE!" -ForegroundColor Green
Write-Host "=" * 80 -ForegroundColor Green
Write-Host ""
Write-Host "Press Enter to close"
Read-Host
