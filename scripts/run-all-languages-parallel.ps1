# Run phonetics generation for all languages in parallel
# Opens 10 PowerShell windows running simultaneously

$languages = @(
    'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko',
    'ar', 'hi', 'bn', 'tr', 'nl', 'pl', 'sv', 'no', 'da', 'fi',
    'el', 'cs', 'hu', 'ro', 'uk', 'bg', 'sr', 'hr', 'sk', 'sl',
    'et', 'lv', 'lt', 'sq', 'ca', 'eu', 'is', 'ga', 'cy', 'mt',
    'he', 'th', 'vi', 'id', 'ms', 'tl', 'sw', 'af', 'zu', 'xh'
)

$workingDir = "d:\woconzi\New folder (4)"

Write-Host "🚀 Starting parallel phonetics generation for $($languages.Count) languages" -ForegroundColor Green
Write-Host "⚡ Running 10 processes in parallel" -ForegroundColor Yellow
Write-Host ""

$batchSize = [Math]::Ceiling($languages.Count / 10)

for ($i = 0; $i -lt 10; $i++) {
    $start = $i * $batchSize
    $end = [Math]::Min($start + $batchSize - 1, $languages.Count - 1)
    
    if ($start -ge $languages.Count) { break }
    
    $batch = $languages[$start..$end]
    $batchList = $batch -join ', '
    
    Write-Host "Window $($i+1): $batchList" -ForegroundColor Cyan
    
    # Create command that processes languages sequentially in this window
    $command = "cd '$workingDir'; "
    $command += "`$languages = @('$($batch -join "', '")'`); "
    $command += "foreach (`$lang in `$languages) { "
    $command += "Write-Host ''; Write-Host ('=' * 80) -ForegroundColor Yellow; "
    $command += "Write-Host `"Processing: `$lang`" -ForegroundColor Green; "
    $command += "Write-Host ('=' * 80) -ForegroundColor Yellow; "
    $command += "npx tsx scripts/generate-phonetics-complete.ts --language=`$lang --force; "
    $command += "}; "
    $command += "Write-Host ''; Write-Host '✅ BATCH COMPLETE' -ForegroundColor Green; "
    $command += "Read-Host 'Press Enter to close'"
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $command
    
    Start-Sleep -Milliseconds 500
}

Write-Host ""
Write-Host "✅ All 10 windows launched!" -ForegroundColor Green
Write-Host "📊 Total languages: $($languages.Count)" -ForegroundColor Cyan
Write-Host "⏱️  Estimated time: 1-2 hours" -ForegroundColor Yellow
