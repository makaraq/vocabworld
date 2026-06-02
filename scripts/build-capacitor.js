const { execSync } = require('child_process')

console.log('Building static export for Capacitor...\n')
try {
  execSync('npx next build', {
    stdio: 'inherit',
    env: { ...process.env, CAPACITOR_BUILD: 'true' }
  })
  console.log('\nStatic export complete → out/')
  console.log('Run "npx cap sync" to copy into native projects.')
} catch {
  process.exit(1)
}
