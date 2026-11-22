export interface Dimensions {
  width: number;
  height: number;
}

function parsePngDimensions(buffer: Buffer): Dimensions | null {
  if (buffer.length < 24) {
    return null;
  }
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47;
  if (!isPng) {
    return null;
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return width > 0 && height > 0 ? { width, height } : null;
}

function parseGifDimensions(buffer: Buffer): Dimensions | null {
  if (buffer.length < 10) {
    return null;
  }
  const header = buffer.subarray(0, 6).toString('ascii');
  if (header !== 'GIF87a' && header !== 'GIF89a') {
    return null;
  }
  const width = buffer.readUInt16LE(6);
  const height = buffer.readUInt16LE(8);
  return width > 0 && height > 0 ? { width, height } : null;
}

function parseJpegDimensions(buffer: Buffer): Dimensions | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null;
  }

  let offset = 2;
  while (offset + 4 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    if (marker === undefined) {
      break;
    }

    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }

    const segmentLength = buffer.readUInt16BE(offset + 2);
    if (segmentLength < 2) {
      break;
    }

    const isSof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);

    if (isSof && offset + 9 <= buffer.length) {
      const height = buffer.readUInt16BE(offset + 5);
      const width = buffer.readUInt16BE(offset + 7);
      return width > 0 && height > 0 ? { width, height } : null;
    }

    offset += 2 + segmentLength;
  }

  return null;
}

function parseWebpDimensions(buffer: Buffer): Dimensions | null {
  if (buffer.length < 30) {
    return null;
  }
  if (
    buffer.subarray(0, 4).toString('ascii') !== 'RIFF' ||
    buffer.subarray(8, 12).toString('ascii') !== 'WEBP'
  ) {
    return null;
  }

  const chunkType = buffer.subarray(12, 16).toString('ascii');
  if (chunkType === 'VP8 ' && buffer.length >= 30) {
    const width = buffer.readUInt16LE(26) & 0x3fff;
    const height = buffer.readUInt16LE(28) & 0x3fff;
    return width > 0 && height > 0 ? { width, height } : null;
  }

  if (chunkType === 'VP8L' && buffer.length >= 25) {
    const bits = buffer.readUInt32LE(21);
    const width = (bits & 0x3fff) + 1;
    const height = ((bits >> 14) & 0x3fff) + 1;
    return width > 0 && height > 0 ? { width, height } : null;
  }

  if (chunkType === 'VP8X' && buffer.length >= 30) {
    const width = 1 + buffer.readUIntLE(24, 3);
    const height = 1 + buffer.readUIntLE(27, 3);
    return width > 0 && height > 0 ? { width, height } : null;
  }

  return null;
}

export function extractMediaDimensions(buffer: Buffer, contentType: string): Dimensions | null {
  if (contentType === 'image/png') {
    return parsePngDimensions(buffer);
  }
  if (contentType === 'image/jpeg') {
    return parseJpegDimensions(buffer);
  }
  if (contentType === 'image/gif') {
    return parseGifDimensions(buffer);
  }
  if (contentType === 'image/webp') {
    return parseWebpDimensions(buffer);
  }
  if (contentType.startsWith('video/')) {
    return { width: 1280, height: 720 };
  }
  return null;
}
