import satori from 'satori'
import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fonts, C, h } from '/Users/thomasdevine/Desktop/football501/scripts/shorts/lib/brand.mjs'

const S = 1024
const el = h('div', { style: { width: S, height: S, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(150deg, ${C.brandBright} -10%, ${C.brand} 35%, ${C.brandDeep} 100%)` } },
  // soft glow
  h('div', { style: { position: 'absolute', top: -180, left: -180, width: 700, height: 700, borderRadius: 9999, background: 'rgba(255,255,255,0.14)', display: 'flex' } }),
  h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center' } },
    h('div', { style: { fontFamily: 'Bebas Neue', fontSize: 232, lineHeight: 0.9, color: '#ffffff', letterSpacing: 2, display: 'flex' } }, 'TRIVI'),
    h('div', { style: { fontFamily: 'Bebas Neue', fontSize: 232, lineHeight: 0.9, color: '#ffffff', letterSpacing: 2, display: 'flex' } }, 'VERSE'),
    h('div', { style: { marginTop: 30, padding: '10px 26px', borderRadius: 9999, background: 'rgba(11,10,20,0.35)', fontFamily: 'Inter', fontWeight: 800, fontSize: 40, letterSpacing: 8, color: '#ffffff', display: 'flex' } }, 'FOOTBALL TRIVIA')))

const svg = await satori(el, { width: S, height: S, fonts })
const png = await sharp(Buffer.from(svg)).png().toBuffer()
mkdirSync('/Users/thomasdevine/Desktop/football501/output/brand', { recursive: true })
const out = '/Users/thomasdevine/Desktop/football501/output/brand/triviverse-app-icon-1024.png'
writeFileSync(out, png)
console.log('wrote', out, `(${(png.length / 1024).toFixed(0)} KB)`)
