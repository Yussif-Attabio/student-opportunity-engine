import { spawn } from 'node:child_process'

const children = ['dev:api', 'dev:client'].map((script) =>
  process.platform === 'win32'
    ? spawn(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', `npm.cmd run ${script}`], {
        stdio: 'inherit',
      })
    : spawn('npm', ['run', script], { stdio: 'inherit' }),
)

let stopping = false

function stop() {
  if (stopping) return
  stopping = true
  for (const child of children) {
    if (!child.killed) child.kill()
  }
}

for (const child of children) {
  child.on('error', (error) => {
    console.error(`[dev] Failed to start: ${error.message}`)
    process.exitCode = 1
    stop()
  })

  child.on('exit', (code) => {
    if (!stopping && code !== 0) {
      process.exitCode = code ?? 1
      stop()
    }
  })
}

process.on('SIGINT', stop)
process.on('SIGTERM', stop)
