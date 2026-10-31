const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPng(size, isForegroundOnly = false) {
  const width = size;
  const height = size;
  const rowStride = width * 4 + 1;
  const rawData = Buffer.alloc(height * rowStride, 0);

  const bgR = 4, bgG = 21, bgB = 59;     // #04153B
  const fgR = 24, fgG = 178, fgB = 247;  // #18B2F7 (Cyan)
  const orR = 245, orG = 158, orB = 11;  // #F59E0B (Orange)

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowStride;
    rawData[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      if (!isForegroundOnly) {
        // Subtle rounded edge
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
      }

      // Default background color
      let r = bgR, g = bgG, b = bgB, a = isForegroundOnly ? 0 : 255;

      if (!isForegroundOnly) {
        // Center subtle glow
        const cx = width / 2;
        const cy = height / 2;
        const dist = Math.hypot(x - cx, y - cy);
        if (dist < size * 0.42) {
          const factor = (1 - dist / (size * 0.42)) * 0.3;
          r = Math.min(255, Math.round(r + 15 * factor));
          g = Math.min(255, Math.round(g + 60 * factor));
          b = Math.min(255, Math.round(b + 140 * factor));
        }
      }

      // Normalized coordinates (0 to 1)
      const nx = x / width;
      const ny = y / height;

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
      const shaft = (nx - 0.48) - (0.36 - ny);
      if (Math.abs(shaft) < 0.025 && nx >= 0.46 && nx <= 0.58 && ny >= 0.22 && ny <= 0.34) isOrange = true;
      if (ny >= 0.21 && ny <= 0.245 && nx >= 0.51 && nx <= 0.58) isOrange = true;
      if (nx >= 0.55 && nx <= 0.585 && ny >= 0.21 && ny <= 0.28) isOrange = true;

      if (isOrange) {
        r = orR; g = orG; b = orB; a = 255;
      } else if (isCyan) {
        r = fgR; g = fgG; b = fgB; a = 255;
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);
  ihdr.writeUInt8(6, 9);
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);

  const ihdrChunk = createChunk('IHDR', ihdr);
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressed);
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

// Generate all Android Mipmap resolutions
const resMap = {
  'mipmap-mdpi': { icon: 48, fg: 108 },
  'mipmap-hdpi': { icon: 72, fg: 162 },
  'mipmap-xhdpi': { icon: 96, fg: 216 },
  'mipmap-xxhdpi': { icon: 144, fg: 324 },
  'mipmap-xxxhdpi': { icon: 192, fg: 432 }
};

const resBase = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

for (const [folder, sizes] of Object.entries(resMap)) {
  const targetDir = path.join(resBase, folder);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const iconBuf = createPng(sizes.icon, false);
  const fgBuf = createPng(sizes.fg, true);

  fs.writeFileSync(path.join(targetDir, 'ic_launcher.png'), iconBuf);
  fs.writeFileSync(path.join(targetDir, 'ic_launcher_round.png'), iconBuf);
  fs.writeFileSync(path.join(targetDir, 'ic_launcher_foreground.png'), fgBuf);
  console.log(`Generated AC icons for ${folder} (${sizes.icon}px & ${sizes.fg}px)`);
}

// Update ic_launcher_background.xml color to AC brand dark blue #04153B
const bgXmlPath = path.join(resBase, 'values', 'ic_launcher_background.xml');
if (fs.existsSync(path.dirname(bgXmlPath))) {
  fs.writeFileSync(bgXmlPath, `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#04153B</color>\n</resources>\n`);
  console.log('Updated ic_launcher_background to AC brand dark blue #04153B');
}

// Replace splash screens with AC branded splash
const splashBuf = createPng(512, false);
const splashFolders = [
  'drawable',
  'drawable-land-hdpi',
  'drawable-land-mdpi',
  'drawable-land-xhdpi',
  'drawable-land-xxhdpi',
  'drawable-land-xxxhdpi',
  'drawable-port-hdpi',
  'drawable-port-mdpi',
  'drawable-port-xhdpi',
  'drawable-port-xxhdpi',
  'drawable-port-xxxhdpi'
];

for (const folder of splashFolders) {
  const sPath = path.join(resBase, folder, 'splash.png');
  if (fs.existsSync(path.dirname(sPath))) {
    fs.writeFileSync(sPath, splashBuf);
    console.log(`Updated AC splash screen in ${folder}/splash.png`);
  }
}

// Also remove the old vector drawable ic_launcher_foreground if present so the PNG foreground is used
const vectorFg = path.join(resBase, 'drawable-v24', 'ic_launcher_foreground.xml');
if (fs.existsSync(vectorFg)) {
  fs.unlinkSync(vectorFg);
  console.log('Removed default Capacitor vector foreground');
}
const vectorBg = path.join(resBase, 'drawable', 'ic_launcher_background.xml');
if (fs.existsSync(vectorBg)) {
  fs.unlinkSync(vectorBg);
  console.log('Removed default Capacitor vector background');
}

console.log('ALL Capacitor Android icons & splash screens successfully branded with AC!');
