import { copyFile, mkdir, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import packageJson from '../../../package.json' with { type: 'json' }

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const releaseRoot = path.resolve(appRoot, '../adminnew_release')
const portableName = `${packageJson.name}-${packageJson.version}-portable.exe`
const portablePath = path.join(appRoot, 'dist', portableName)
const releasePath = path.join(releaseRoot, portableName)

if (process.platform !== 'win32') {
  throw new Error('Windows releases must be built on Windows.')
}

await stat(portablePath)
await mkdir(releaseRoot, { recursive: true })
await stat(path.join(releaseRoot, '.git'))
await copyFile(portablePath, releasePath)

console.log(`Portable release copied to ${releasePath}`)
