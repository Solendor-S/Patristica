const fs   = require('fs')
const path = require('path')
const zlib = require('zlib')

const W = 1024
const H = 500

const BG    = { r: 0x1e, g: 0x25, b: 0x3a }  // dark navy
const CROSS = { r: 0xc9, g: 0xa8, b: 0x4c }  // gold
const DIM   = { r: 0xc9, g: 0xa8, b: 0x4c, a: 40 }  // faint gold for subtitle

function clamp(v) { return Math.max(0, Math.min(255, Math.round(v))) }

// ── Cross (left side, centred at x=230, y=H/2) ─────────────
const CX_CENTRE = 230
const CY_CENTRE = H / 2
const ARM   = 52
const VSPAN = 260
const HSPAN = 190
const VBAR_X1 = CX_CENTRE - ARM / 2
const VBAR_X2 = CX_CENTRE + ARM / 2
const VBAR_Y1 = CY_CENTRE - VSPAN / 2
const VBAR_Y2 = CY_CENTRE + VSPAN / 2
// Crossbeam ~36% down the vertical span from top
const HB_Y1 = VBAR_Y1 + Math.round(VSPAN * 0.32)
const HB_Y2 = HB_Y1 + ARM
const HB_X1 = CX_CENTRE - HSPAN / 2
const HB_X2 = CX_CENTRE + HSPAN / 2

function inCross(px, py) {
  const inVert  = px >= VBAR_X1 && px <= VBAR_X2 && py >= VBAR_Y1 && py <= VBAR_Y2
  const inHoriz = px >= HB_X1   && px <= HB_X2   && py >= HB_Y1   && py <= HB_Y2
  return inVert || inHoriz
}

// ── Text rasteriser (bitmap font 7×9 per glyph, scale factor) ─
// Each char is 5×7 pixels defined as 7 rows of 5 bits (MSB = left)
const GLYPHS = {
  'P': [0b11110,0b10001,0b10001,0b11110,0b10000,0b10000,0b10000],
  'a': [0b01110,0b00001,0b01111,0b10001,0b10001,0b10011,0b01101],
  't': [0b11111,0b00100,0b00100,0b00100,0b00100,0b00100,0b00011],
  'r': [0b10110,0b11001,0b10000,0b10000,0b10000,0b10000,0b10000],
  'i': [0b01100,0b00000,0b01100,0b01100,0b01100,0b01100,0b01110],
  'c': [0b01110,0b10001,0b10000,0b10000,0b10000,0b10001,0b01110],
  's': [0b01111,0b10000,0b10000,0b01110,0b00001,0b00001,0b11110],
  'B': [0b11110,0b10001,0b10001,0b11110,0b10001,0b10001,0b11110],
  'b': [0b10000,0b10000,0b10110,0b11001,0b10001,0b10001,0b11110],
  'e': [0b01110,0b10001,0b10001,0b11111,0b10000,0b10000,0b01111],
  'l': [0b01100,0b01100,0b01100,0b01100,0b01100,0b01100,0b01111],
  'S': [0b01111,0b10000,0b10000,0b01110,0b00001,0b00001,0b11110],
  'u': [0b10001,0b10001,0b10001,0b10001,0b10001,0b10011,0b01101],
  'd': [0b00001,0b00001,0b01101,0b10011,0b10001,0b10001,0b01101],
  'y': [0b10001,0b10001,0b10001,0b01111,0b00001,0b10001,0b01110],
  'o': [0b01110,0b10001,0b10001,0b10001,0b10001,0b10001,0b01110],
  'f': [0b00111,0b00100,0b11100,0b00100,0b00100,0b00100,0b00100],
  'h': [0b10000,0b10000,0b10110,0b11001,0b10001,0b10001,0b10001],
  'E': [0b11111,0b10000,0b10000,0b11110,0b10000,0b10000,0b11111],
  'C': [0b01110,0b10001,0b10000,0b10000,0b10000,0b10001,0b01110],
  'F': [0b11111,0b10000,0b10000,0b11110,0b10000,0b10000,0b10000],
  'H': [0b10001,0b10001,0b10001,0b11111,0b10001,0b10001,0b10001],
  'w': [0b10001,0b10001,0b10001,0b10101,0b10101,0b11011,0b10001],
  'n': [0b11010,0b10101,0b10001,0b10001,0b10001,0b10001,0b10001],
  'g': [0b01101,0b10011,0b10001,0b10001,0b01111,0b00001,0b01110],
  'k': [0b10001,0b10010,0b10100,0b11000,0b10100,0b10010,0b10001],
  ' ': [0b00000,0b00000,0b00000,0b00000,0b00000,0b00000,0b00000],
  '·': [0b00000,0b00000,0b00000,0b01100,0b01100,0b00000,0b00000],
}

function drawText(buf, text, startX, startY, scale, color) {
  let cx = startX
  for (const ch of text) {
    const rows = GLYPHS[ch] ?? GLYPHS[' ']
    for (let gy = 0; gy < 7; gy++) {
      for (let gx = 0; gx < 5; gx++) {
        if (rows[gy] & (1 << (4 - gx))) {
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              const px = cx + gx * scale + sx
              const py = startY + gy * scale + sy
              if (px >= 0 && px < W && py >= 0 && py < H) {
                const idx = (py * W + px) * 4
                buf[idx]   = color.r
                buf[idx+1] = color.g
                buf[idx+2] = color.b
                buf[idx+3] = color.a ?? 255
              }
            }
          }
        }
      }
    }
    cx += (5 + 1) * scale
  }
}

// ── Divider line ────────────────────────────────────────────
function drawLine(buf, x1, y1, x2, y2, color) {
  const steps = Math.max(Math.abs(x2-x1), Math.abs(y2-y1))
  for (let i = 0; i <= steps; i++) {
    const px = Math.round(x1 + (x2-x1) * i/steps)
    const py = Math.round(y1 + (y2-y1) * i/steps)
    if (px >= 0 && px < W && py >= 0 && py < H) {
      const idx = (py * W + px) * 4
      buf[idx]   = color.r; buf[idx+1] = color.g
      buf[idx+2] = color.b; buf[idx+3] = color.a ?? 255
    }
  }
}

// ── Build pixel buffer ──────────────────────────────────────
const buf = Buffer.alloc(W * H * 4)

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4
    buf[i] = BG.r; buf[i+1] = BG.g; buf[i+2] = BG.b; buf[i+3] = 255

    if (inCross(x, y)) {
      buf[i] = CROSS.r; buf[i+1] = CROSS.g; buf[i+2] = CROSS.b
    }
  }
}

// Vertical divider between cross and text areas
const DIV_X = 390
for (let y = 80; y < H - 80; y++) {
  const i = (y * W + DIV_X) * 4
  buf[i] = CROSS.r; buf[i+1] = CROSS.g; buf[i+2] = CROSS.b; buf[i+3] = 60
}

// Title: "Patristica" — scale 8 → each pixel 8×8 = glyph ~56px tall
const TITLE_SCALE = 8
const TITLE_W = 'Patristica'.length * 6 * TITLE_SCALE
const TITLE_X = DIV_X + Math.round((W - DIV_X - TITLE_W) / 2)
const TITLE_Y = Math.round(H / 2) - 7 * TITLE_SCALE - 18
drawText(buf, 'Patristica', TITLE_X, TITLE_Y, TITLE_SCALE, CROSS)

// Subtitle: "Bible · Study · Church History" — scale 3
const SUB = 'Bible · Study · Church History'
const SUB_SCALE = 3
const SUB_W = SUB.length * 6 * SUB_SCALE
const SUB_X = DIV_X + Math.round((W - DIV_X - SUB_W) / 2)
const SUB_Y = TITLE_Y + 7 * TITLE_SCALE + 20
drawText(buf, SUB, SUB_X, SUB_Y, SUB_SCALE, { r: 0xb0, g: 0x9a, b: 0x6a, a: 200 })

// ── PNG writer ──────────────────────────────────────────────
function writePNG(filename, width, height, data) {
  const crcTable = (() => {
    const t = new Uint32Array(256)
    for (let i = 0; i < 256; i++) {
      let c = i
      for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      t[i] = c
    }
    return t
  })()
  function crc32(b) {
    let crc = -1
    for (const byte of b) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff]
    return (crc ^ -1) >>> 0
  }
  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
    const t = Buffer.from(type)
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])))
    return Buffer.concat([len, t, data, crc])
  }
  const filtered = Buffer.alloc(height * (1 + width * 4))
  for (let y = 0; y < height; y++) {
    filtered[y * (1 + width * 4)] = 0
    data.copy(filtered, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8; ihdr[9] = 6
  const sig = Buffer.from([137,80,78,71,13,10,26,10])
  const idat = chunk('IDAT', zlib.deflateSync(filtered, { level: 6 }))
  const out = Buffer.concat([sig, chunk('IHDR', ihdr), idat, chunk('IEND', Buffer.alloc(0))])
  fs.writeFileSync(filename, out)
  console.log(`Written: ${filename} (${(out.length/1024).toFixed(0)} KB)`)
}

writePNG(path.join(__dirname, '../assets/feature-graphic.png'), W, H, buf)
