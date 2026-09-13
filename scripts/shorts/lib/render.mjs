// Frame rendering (satori → SVG → resvg → PNG) and video assembly (ffmpeg-static).
// satori rasterises text to vector paths, so resvg needs no fonts and output is crisp.
import satori from 'satori'
import sharp from 'sharp'
import { spawnSync } from 'child_process'
import ffmpegPath from 'ffmpeg-static'
import { writeFileSync, mkdtempSync, rmSync } from 'fs'
import path from 'path'
import os from 'os'
import { fonts } from './brand.mjs'

export const W = 1080, H = 1920 // 9:16 vertical

// satori vectorises text to paths (no fonts needed downstream); sharp rasterises the SVG ~45× faster
// than resvg here (~20ms vs ~900ms), and it's already a project dependency (og-images.mjs).
export async function renderPng(element) {
  const svg = await satori(element, { width: W, height: H, fonts })
  return sharp(Buffer.from(svg)).png({ compressionLevel: 3 }).toBuffer()
}

// Render every frame of a template into an MP4. templateScene(t) → satori element.
export async function renderVideo({ scene, fps, durationSec, outPath, onFrame }) {
  const frames = Math.round(durationSec * fps)
  const dir = mkdtempSync(path.join(os.tmpdir(), 'tv-short-'))
  try {
    for (let i = 0; i < frames; i++) {
      const png = await renderPng(scene(i / fps))
      writeFileSync(path.join(dir, `f${String(i).padStart(5, '0')}.png`), png)
      if (onFrame) onFrame(i, frames)
    }
    const args = [
      '-y', '-framerate', String(fps), '-i', path.join(dir, 'f%05d.png'),
      // yuv420p + even dims for broad TikTok/Shorts compatibility; H.264 high quality
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '20',
      '-movflags', '+faststart', outPath,
    ]
    const r = spawnSync(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    if (r.status !== 0) throw new Error('ffmpeg failed: ' + (r.stderr?.toString().split('\n').slice(-4).join(' ') || r.status))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
  return outPath
}

// Render a single still (for design iteration/thumbnails).
export async function renderStill(element, outPath) { writeFileSync(outPath, await renderPng(element)); return outPath }
