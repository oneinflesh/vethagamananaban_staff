import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const environment = { ...process.env }
delete environment.ELECTRON_RUN_AS_NODE

const command = process.argv[2] || 'dev'
const vite = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../node_modules/electron-vite/bin/electron-vite.js'
)
const child = spawn(process.execPath, [vite, command], {
  env: environment,
  stdio: 'inherit'
})

child.on('error', (error) => {
  console.error(error)
  process.exitCode = 1
})
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exitCode = code ?? 1
})
