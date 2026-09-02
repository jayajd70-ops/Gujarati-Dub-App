import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPngBuffer(width, height, r, g, b) {
  // Simple uncompressed/deflated raw PNG generator
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8-bit depth
  ihdrData.writeUInt8(2, 9); // RGB color type
  ihdrData.writeUInt8(0, 10); // Compression
  ihdrData.writeUInt8(0, 11); // Filter
  ihdrData.writeUInt8(0, 12); // Interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Raw image scanlines (Filter byte 0 + RGB pixels)
  const rowLength = 1 + width * 3;
  const rawData = Buffer.alloc(rowLength * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLength;
    rawData[rowOffset] = 0; // No filter

    // Draw circular gradient icon
    const cy = height / 2;
    const cx = width / 2;
    const radius = width * 0.4;

    for (let x = 0; x < width; x++) {
      const px = rowOffset + 1 + x * 3;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);

      if (dist <= radius) {
        // Vibrant Cyan / Indigo gradient
        const t = (x + y) / (width + height);
        rawData[px] = Math.floor(56 * (1 - t) + 168 * t);
        rawData[px + 1] = Math.floor(189 * (1 - t) + 85 * t);
        rawData[px + 2] = Math.floor(248 * (1 - t) + 247 * t);
      } else {
        // Dark background
        rawData[px] = 15;
        rawData[px + 1] = 23;
        rawData[px + 2] = 42;
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = data.length;
  const chunk = Buffer.alloc(12 + length);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crc = crc32(chunk.subarray(4, 8 + length));
  chunk.writeUInt32BE(crc, 8 + length);
  return chunk;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const iconsDir = path.resolve('public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), createPngBuffer(192, 192, 56, 189, 248));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), createPngBuffer(512, 512, 56, 189, 248));
console.log('Icons generated successfully');
