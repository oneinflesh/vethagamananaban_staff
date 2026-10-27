import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const releaseRoot = path.resolve(appRoot, '../adminnew_release')
const unpackedPath = path.join(appRoot, 'dist', 'win-unpacked')
const executableName = 'VethagamaNanbanOffice.exe'

if (process.platform !== 'win32') {
  throw new Error('Windows releases must be built on Windows.')
}

await stat(path.join(unpackedPath, executableName))
await stat(path.join(releaseRoot, '.git'))
if (path.dirname(releaseRoot) !== path.dirname(appRoot) || path.basename(releaseRoot) !== 'adminnew_release') {
  throw new Error('Unexpected release directory; refusing to replace files.')
}

for (const entry of await readdir(releaseRoot, { withFileTypes: true })) {
  if (entry.name === '.git' || entry.name === '.gitattributes' || entry.name === '.gitignore') continue
  await rm(path.join(releaseRoot, entry.name), { recursive: entry.isDirectory(), force: true })
}

await mkdir(releaseRoot, { recursive: true })
await cp(unpackedPath, releaseRoot, { recursive: true })

console.log(`Standalone release copied to ${releaseRoot}`)
