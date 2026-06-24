const fs = require('fs')
const path = require('path')

const SIZE = 1024
const RADIUS = 180  // rounded corners

// Colors matching desktop icon
const BG     = { r: 0x1e, g: 0x25, b: 0x3a }  // dark navy
const CROSS  = { r: 0xc9, g: 0xa8, b: 0x4c }  // gold

function clamp(v) { return Math.max(0, Math.min(255, Math.round(v))) }

// Correct rounded rect: check nearest corner circle only when in corner region
function inRoundedRect(px, py, x, y, w, h, r) {
  if (px < x || px > x + w || py < y || py > y + h) return false
  const inXMiddle = px >= x + r && px <= x + w - r
  const inYMiddle = py >= y + r && py <= y + h - r
  if (inXMiddle || inYMiddle) return true
  // In a corner region — check distance to corner center
  const cx = px < x + r ? x + r : x + w - r
  const cy = py < y + r ? y + r : y + h - r
  const dx = px - cx, dy = py - cy
  return dx * dx + dy * dy <= r * r
}

// Cross dimensions — Latin cross: taller vertical than horizontal
const ARM   = Math.round(SIZE * 0.17)   // arm thickness
const VSPAN = Math.round(SIZE * 0.72)   // vertical bar total height
const HSPAN = Math.round(SIZE * 0.54)   // horizontal bar total width
const CX    = (SIZE - ARM)   / 2                        // left edge of vertical bar
const CY    = (SIZE - VSPAN) / 2                        // top edge of vertical bar
const HX    = (SIZE - HSPAN) / 2                        // left edge of horizontal bar
// Crossbeam anchored just above absolute icon centre (matches desktop icon)
const HY    = Math.round(SIZE * 0.36)                   // top edge of horizontal bar

function inCross(px, py) {
  const inVert  = px >= CX && px <= CX + ARM   && py >= CY && py <= CY + VSPAN
  const inHoriz = px >= HX && px <= HX + HSPAN && py >= HY && py <= HY + ARM
  return inVert || inHoriz
}

// Build raw RGBA buffer
const buf = Buffer.alloc(SIZE * SIZE * 4)

for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const i = (y * SIZE + x) * 4
    const inBg    = inRoundedRect(x, y, 0, 0, SIZE, SIZE, RADIUS)
    const inCrossShape = inCross(x, y)

    if (!inBg) {
      // Transparent outside rounded rect
      buf[i] = buf[i+1] = buf[i+2] = buf[i+3] = 0
    } else if (inCrossShape) {
      buf[i]   = CROSS.r
      buf[i+1] = CROSS.g
      buf[i+2] = CROSS.b
      buf[i+3] = 255
    } else {
      buf[i]   = BG.r
      buf[i+1] = BG.g
      buf[i+2] = BG.b
      buf[i+3] = 255
    }
  }
}

// Write as PNG using pure JS (no deps)
function writePNG(filename, width, height, data) {
  function crc32(buf) {
    let crc = -1
    for (const b of buf) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ b) & 0xff]
    }
    return (crc ^ -1) >>> 0
  }
  const crcTable = (() => {
    const t = new Uint32Array(256)
    for (let i = 0; i < 256; i++) {
      let c = i
      for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      t[i] = c
    }
    return t
  })()

  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
    const t   = Buffer.from(type)
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(Buffer.concat([t, data])))
    return Buffer.concat([len, t, data, crc])
  }

  function deflate(raw) {
    // Use Node's built-in zlib
    const zlib = require('zlib')
    return zlib.deflateSync(raw, { level: 6 })
  }

  // Filter: prepend 0 (None) to each row
  const filtered = Buffer.alloc(height * (1 + width * 4))
  for (let y = 0; y < height; y++) {
    filtered[y * (1 + width * 4)] = 0
    data.copy(filtered, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8   // bit depth
  ihdr[9] = 6   // RGBA
  ihdr[10] = ihdr[11] = ihdr[12] = 0

  const sig  = Buffer.from([137,80,78,71,13,10,26,10])
  const idat = chunk('IDAT', deflate(filtered))
  const out  = Buffer.concat([sig, chunk('IHDR', ihdr), idat, chunk('IEND', Buffer.alloc(0))])
  fs.writeFileSync(filename, out)
  console.log(`Written: ${filename} (${(out.length/1024).toFixed(0)} KB)`)
}

writePNG(path.join(__dirname, '../assets/icon.png'), SIZE, SIZE, buf)

// Also write 512x512 version by downsampling 2x2 box filter
const S2 = 512
const buf2 = Buffer.alloc(S2 * S2 * 4)
for (let y = 0; y < S2; y++) {
  for (let x = 0; x < S2; x++) {
    const i2 = (y * S2 + x) * 4
    // Average 2x2 block from source
    let r=0,g=0,b=0,a=0
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const si = ((y*2+dy)*SIZE + (x*2+dx))*4
        a += buf[si+3]
        r += buf[si]  ; g += buf[si+1]; b += buf[si+2]
      }
    }
    buf2[i2]=clamp(r/4); buf2[i2+1]=clamp(g/4); buf2[i2+2]=clamp(b/4); buf2[i2+3]=clamp(a/4)
  }
}
writePNG(path.join(__dirname, '../assets/icon-512.png'), S2, S2, buf2)
