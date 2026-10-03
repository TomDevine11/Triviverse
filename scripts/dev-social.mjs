#!/usr/bin/env node
// Local full stack for the social layer: the Cloudflare Worker (API + D1 +
// share images) on :8787 and Vite on :5173 proxying to it. Open
// http://localhost:5173 as usual.
//
//   npm run dev:social            (builds dist/ first if it's missing)
//   npm run dev:social -- --fresh (wipe the local D1 database first)

import { spawn, spawnSync } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'

const run = (cmd, args) => spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' })

if (process.argv.includes('--fresh')) rmSync('.wrangler/state/v3/d1', { recursive: true, force: true })
if (!existsSync('dist/app-shell.html')) run('npm', ['run', 'build:pages'])
run('npx', ['wrangler', 'd1', 'migrations', 'apply', 'triviverse-social', '--local'])

const kids = [
  spawn('npx', ['wrangler', 'dev', '--port', '8787', '--ip', '127.0.0.1'], { stdio: 'inherit' }),
  spawn('npx', ['vite'], { stdio: 'inherit' }),
]
const stop = () => { for (const k of kids) k.kill('SIGINT'); process.exit(0) }
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
