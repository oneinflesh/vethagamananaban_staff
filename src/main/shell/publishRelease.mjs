import { cp, readdir, rm, stat } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const releaseRoot = path.resolve(appRoot, '../adminnew_release')
const unpackedPath = path.join(appRoot, 'dist', 'win-unpacked')
const executableName = 'VethagamaNanbanOffice.exe'
const releaseZip = path.join(releaseRoot, 'VethagamaNanbanOffice.zip')

if (process.platform !== 'win32') {
  throw new Error('Windows releases must be built on Windows.')
}

await stat(path.join(unpackedPath, executableName))
await stat(path.join(releaseRoot, '.git'))
if (path.dirname(releaseRoot) !== path.dirname(appRoot) || path.basename(releaseRoot) !== 'adminnew_release') {
  throw new Error('Unexpected release directory; refusing to replace files.')
}

for (const entry of await readdir(releaseRoot, { withFileTypes: true })) {
  if (entry.name === '.git' || entry.name === '.gitignore' || entry.name === 'README.md') continue
  await rm(path.join(releaseRoot, entry.name), { recursive: entry.isDirectory(), force: true })
}

await cp(unpackedPath, releaseRoot, { recursive: true })
const quote = (value) => `'${value.replaceAll("'", "''")}'`
execFileSync('powershell.exe', [
  '-NoProfile',
  '-NonInteractive',
  '-Command',
  `Compress-Archive -Path ${quote(path.join(unpackedPath, '*'))} -DestinationPath ${quote(releaseZip)} -Force`
], { stdio: 'inherit' })

console.log(`Standalone release and ZIP saved to ${releaseRoot}`)
