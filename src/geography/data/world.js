// The shared world map (./world.generated.json): every country on one Mercator,
// with a framing box (`bb`) and a label point (`lp`) in map units. Built with the
// country data by scripts/geography/build-countries.mjs (Natural Earth, public domain).
import data from './world.generated.json' with { type: 'json' }

export const WORLD_W = data.meta.w
export const WORLD_H = data.meta.h
export const SHAPES = data.countries
const BY_CODE = new Map(SHAPES.map(s => [s.code, s]))
export const shapeOf = (code) => BY_CODE.get(code) || null

// A viewBox [x, y, w, h] framing the given countries, padded, never narrower than
// `min`, and stretched to the container's aspect ratio (w / h) so nothing distorts.
export function frame(codes, aspect, { pad = 0.16, min = 340 } = {}) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const c of codes) {
    const s = shapeOf(c)
    if (!s) continue
    x0 = Math.min(x0, s.bb[0]); y0 = Math.min(y0, s.bb[1]); x1 = Math.max(x1, s.bb[2]); y1 = Math.max(y1, s.bb[3])
  }
  if (!isFinite(x0)) return [0, 0, WORLD_W, WORLD_H]
  let w = Math.max(min, (x1 - x0) * (1 + pad * 2)), h = Math.max(min / aspect, (y1 - y0) * (1 + pad * 2))
  if (w / h < aspect) w = h * aspect; else h = w / aspect
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2
  return [cx - w / 2, cy - h / 2, w, h]
}

// Countries whose box touches a view (with a margin), for culling the render.
export function visibleIn([x, y, w, h], margin = 0.25) {
  const mx = w * margin, my = h * margin
  return SHAPES.filter(s => s.bb[2] >= x - mx && s.bb[0] <= x + w + mx && s.bb[3] >= y - my && s.bb[1] <= y + h + my)
}

// ── Coordinates ⇄ map units ────────────────────────────────────────────────────
// The exact inverse pair of the build's d3 projection: Mercator, centred on 11°E,
// k = W / 2π, cropped at 84°N (scripts/geography/build-countries.mjs). Pin drops and
// answers go through these, so a pin is as precise as the screen allows — the
// country outlines' simplification never affects scoring.
const LON0 = 11
const K = WORLD_W / (2 * Math.PI)
const RAD = Math.PI / 180
const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * RAD) / 2))
const TOP = mercY(84)
export const MAX_LAT = 84
export const MIN_LAT = -57

export function project(lat, lon) {
  const l = ((((lon - LON0 + 180) % 360) + 360) % 360) - 180 // seam at 169°W
  return [WORLD_W / 2 + K * l * RAD, K * (TOP - mercY(Math.max(-85, Math.min(85, lat))))]
}

export function invert(x, y) {
  const lat = (2 * Math.atan(Math.exp(TOP - y / K)) - Math.PI / 2) / RAD
  let lon = (x - WORLD_W / 2) / K / RAD + LON0
  lon = ((((lon + 180) % 360) + 360) % 360) - 180
  return [lat, lon]
}
