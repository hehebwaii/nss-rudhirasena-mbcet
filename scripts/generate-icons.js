import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(width, height, isMaskable = false) {
  // Create RGBA raw buffer
  const rawData = Buffer.alloc(height * (1 + width * 4));
  
  const cx = width / 2;
  const cy = height / 2;
  const r = width * (isMaskable ? 0.48 : 0.44);

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // PNG filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Gradient background calculation
      const t = (x + y) / (width + height);
      let red = Math.round(220 * (1 - t * 0.3));
      let green = Math.round(38 * (1 - t * 0.4));
      let blue = Math.round(38 * (1 - t * 0.4));
      let alpha = 255;

      if (!isMaskable) {
        // Rounded corner container
        const cornerR = width * 0.22;
        const inBoxX = Math.abs(x - cx) <= (cx - cornerR);
        const inBoxY = Math.abs(y - cy) <= (cy - cornerR);
        if (!inBoxX && !inBoxY) {
          const cornerDist = Math.hypot(Math.abs(x - cx) - (cx - cornerR), Math.abs(y - cy) - (cy - cornerR));
          if (cornerDist > cornerR) {
            alpha = 0;
          }
        }
      }

      if (alpha > 0) {
        // Draw Blood Droplet Shape in Center
        // Drop equation approximate: circle at bottom, triangle at top
        const dropCenterY = cy + height * 0.08;
        const dropRadius = width * 0.22;
        const distFromDropCenter = Math.hypot(x - cx, y - dropCenterY);
        
        let inDrop = false;
        if (distFromDropCenter <= dropRadius) {
          inDrop = true;
        } else if (y < dropCenterY && y > cy - height * 0.3) {
          const halfWidthAtY = dropRadius * (1 - (cy - height * 0.3 - y) / (dropCenterY - (cy - height * 0.3)));
          if (Math.abs(x - cx) <= halfWidthAtY * 1.1) {
            inDrop = true;
          }
        }

        if (inDrop) {
          // White drop interior
          red = 255;
          green = 255;
          blue = 255;

          // Red Cross on Drop
          const crossW = width * 0.04;
          const crossH = height * 0.12;
          const inCrossV = Math.abs(x - cx) <= crossW && Math.abs(y - dropCenterY) <= crossH;
          const inCrossH = Math.abs(x - cx) <= crossH && Math.abs(y - dropCenterY) <= crossW;
          if (inCrossV || inCrossH) {
            red = 185;
            green = 28;
            blue = 28;
          }
        }
      }

      rawData[offset++] = red;
      rawData[offset++] = green;
      rawData[offset++] = blue;
      rawData[offset++] = alpha;
    }
  }

  // Compress IDAT
  const compressed = zlib.deflateSync(rawData);

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = createChunk('IHDR', ihdr);

  // IDAT chunk
  const idatChunk = createChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);

  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(body), 0);

  return Buffer.concat([len, body, crcBuf]);
}

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }

  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'icon-192.png'), createPNG(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), createPNG(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'icon-512-maskable.png'), createPNG(512, 512, true));
console.log('PNG icons created successfully in /public');
