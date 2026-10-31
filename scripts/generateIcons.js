const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPng(size, text) {
  const width = size;
  const height = size;

  // Raw uncompressed RGBA pixel data (height rows, each row prefixed with filter byte 0)
  const rowStride = width * 4 + 1;
  const rawData = Buffer.alloc(height * rowStride, 0);

  // Background color #04153B -> R: 4, G: 21, B: 59, A: 255
  // Accent cyan #18B2F7 -> R: 24, G: 178, B: 247
  // Orange #F59E0B -> R: 245, G: 158, B: 11
  // White #FFFFFF -> R: 255, G: 255, B: 255
  
  const bgR = 4, bgG = 21, bgB = 59;
  const fgR = 24, fgG = 178, fgB = 247;
  const orR = 245, orG = 158, orB = 11;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowStride;
    rawData[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // Draw rounded rectangle background
      const radius = size * 0.22;
      let inCorner = false;
      if (x < radius && y < radius && Math.hypot(x - radius, y - radius) > radius) inCorner = true;
      if (x > width - radius && y < radius && Math.hypot(x - (width - radius), y - radius) > radius) inCorner = true;
      if (x < radius && y > height - radius && Math.hypot(x - radius, y - (height - radius)) > radius) inCorner = true;
      if (x > width - radius && y > height - radius && Math.hypot(x - (width - radius), y - (height - radius)) > radius) inCorner = true;

      if (inCorner) {
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
        continue;
      }

      // Default background color
      let r = bgR, g = bgG, b = bgB, a = 255;

      // Draw subtle circular gradient in center
      const cx = width / 2;
      const cy = height / 2;
      const dist = Math.hypot(x - cx, y - cy);
      if (dist < size * 0.42) {
        const factor = (1 - dist / (size * 0.42)) * 0.3;
        r = Math.min(255, Math.round(r + 15 * factor));
        g = Math.min(255, Math.round(g + 60 * factor));
        b = Math.min(255, Math.round(b + 140 * factor));
      }

      // Draw "A" glyph representation (left side)
      // Normalized coords (0 to 1)
      const nx = x / width;
      const ny = y / height;

      // Stylized "A" (nx between 0.22 and 0.52, ny between 0.30 and 0.72)
      // Stylized "C" (nx between 0.56 and 0.82, ny between 0.30 and 0.72)
      // Orange arrow at top right of "A" (nx between 0.44 and 0.58, ny between 0.22 and 0.36)

      let isCyan = false;
      let isOrange = false;

      // Left leg of A
      const leftLegX = 0.38 - (ny - 0.30) * 0.36;
      if (ny >= 0.30 && ny <= 0.72 && Math.abs(nx - leftLegX) < 0.045) isCyan = true;

      // Right leg of A
      const rightLegX = 0.38 + (ny - 0.30) * 0.36;
      if (ny >= 0.30 && ny <= 0.72 && Math.abs(nx - rightLegX) < 0.045) isCyan = true;

      // Horizontal bar of A
      if (ny >= 0.53 && ny <= 0.59 && nx >= 0.29 && nx <= 0.47) isCyan = true;

      // "C" arc (center around nx: 0.69, ny: 0.51, radius ~ 0.17)
      const cDist = Math.hypot(nx - 0.69, ny - 0.51);
      if (cDist >= 0.115 && cDist <= 0.175 && (nx < 0.75 || ny < 0.42 || ny > 0.60)) {
        isCyan = true;
      }

      // Upward Arrow ↗ in Orange
      // Main arrow shaft
      const shaft = (nx - 0.48) - (0.36 - ny);
      if (Math.abs(shaft) < 0.025 && nx >= 0.46 && nx <= 0.58 && ny >= 0.22 && ny <= 0.34) isOrange = true;
      // Arrow head horizontal tip
      if (ny >= 0.21 && ny <= 0.245 && nx >= 0.51 && nx <= 0.58) isOrange = true;
      // Arrow head vertical tip
      if (nx >= 0.55 && nx <= 0.585 && ny >= 0.21 && ny <= 0.28) isOrange = true;

      if (isOrange) {
        r = orR; g = orG; b = orB;
      } else if (isCyan) {
        r = fgR; g = fgG; b = fgB;
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  // PNG File Structure
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth 8
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  const ihdrChunk = createChunk('IHDR', ihdr);

  // IDAT Chunk (zlib compressed)
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressed);

  // IEND Chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = data.length;
  const chunk = Buffer.alloc(4 + 4 + len + 4);
  chunk.writeUInt32BE(len, 0);
  typeBuf.copy(chunk, 4);
  data.copy(chunk, 8);

  const crc = crc32(Buffer.concat([typeBuf, data]));
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

// Standard CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), createPng(192, 'AC'));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), createPng(512, 'AC'));
fs.writeFileSync(path.join(iconsDir, 'icon-maskable.png'), createPng(512, 'AC'));
console.log('Generated AC PWA icons successfully in public/icons/');

