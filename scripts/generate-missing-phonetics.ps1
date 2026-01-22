# Generate phonetics for incomplete languages
# This script will complete phonetics for all languages that are incomplete

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Missing Phonetics Generator" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Languages with incomplete phonetics (need completion)
$incompleteLanguages = @(
    'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko',
    'hi', 'bn', 'tr', 'nl', 'pl', 'sv', 'no', 'da', 'fi',
    'el', 'cs', 'hu', 'ro', 'uk', 'bg', 'sr', 'hr', 'sk',
    'sl', 'et', 'lv', 'lt', 'sq', 'ca', 'eu', 'is', 'ga',
    'cy', 'mt', 'he', 'th', 'vi', 'id'
)

# Languages not started
$newLanguages = @('ms', 'tl', 'sw', 'af', 'zu', 'xh')

Write-Host "📊 Languages to complete: $($incompleteLanguages.Count)" -ForegroundColor Yellow
Write-Host "🆕 Languages to start: $($newLanguages.Count)" -ForegroundColor Green
Write-Host ""

$totalLanguages = $incompleteLanguages.Count + $newLanguages.Count
$currentLang = 0

# Process incomplete languages first
foreach ($lang in $incompleteLanguages) {
    $currentLang++
    Write-Host "[$currentLang/$totalLanguages] Processing $lang (completing missing phonetics)..." -ForegroundColor Cyan
    
    npx tsx scripts/generate-phonetics-complete.ts --language=$lang
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error processing $lang" -ForegroundColor Red
    } else {
        Write-Host "✅ Completed $lang" -ForegroundColor Green
    }
    Write-Host ""
}

# Process new languages
foreach ($lang in $newLanguages) {
    $currentLang++
    Write-Host "[$currentLang/$totalLanguages] Processing $lang (new language)..." -ForegroundColor Green
    
    npx tsx scripts/generate-phonetics-complete.ts --language=$lang
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error processing $lang" -ForegroundColor Red
    } else {
        Write-Host "✅ Completed $lang" -ForegroundColor Green
    }
    Write-Host ""
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Generation Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Run check script to verify:" -ForegroundColor Yellow
Write-Host "  npx tsx scripts/check-all-languages.ts" -ForegroundColor White
