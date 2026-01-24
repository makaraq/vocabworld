# Start full generation in separate PowerShell window
# This will run in the background and can be resumed if interrupted

# Navigate to project directory and run
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'd:\woconzi\New folder (4)'; Write-Host '🚀 Starting full example sentence generation...' -ForegroundColor Green; Write-Host ''; Write-Host 'This will process all 3,921 words (~18 hours)' -ForegroundColor Yellow; Write-Host 'The window will stay open and show progress' -ForegroundColor Yellow; Write-Host 'If interrupted, it will resume from where it left off' -ForegroundColor Yellow; Write-Host ''; npx tsx scripts/generate-examples-consistent.ts; Write-Host ''; Write-Host '✅ Generation complete! Press any key to close...' -ForegroundColor Green; `$null = `$Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')"
