import { copyFile, mkdir, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import packageJson from '../../../package.json' with { type: 'json' }

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const releaseRoot = path.resolve(appRoot, '../adminnew_release')
const installerName = `${packageJson.name}-${packageJson.version}-setup.exe`
const installerPath = path.join(appRoot, 'dist', installerName)
const releasePath = path.join(releaseRoot, installerName)

if (process.platform !== 'win32') {
  throw new Error('Windows releases must be built on Windows.')
}

await stat(installerPath)
await mkdir(releaseRoot, { recursive: true })
await stat(path.join(releaseRoot, '.git'))
await copyFile(installerPath, releasePath)

console.log(`Release installer copied to ${releasePath}`)
