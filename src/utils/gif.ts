/**
 * ---------------------------------------------------------------------------
 *  A SMALL, DEPENDENCY-FREE GIF89a ENCODER
 * ---------------------------------------------------------------------------
 *  GIF export needs a quantiser and an LZW compressor, and every library that
 *  provides them is either 40 kB of encoder we do not need or a wrapper around
 *  a canvas GIF extension that only exists in one browser. So this module is
 *  written out in full: median-cut colour reduction per frame (GIF allows a
 *  local colour table, which is both simpler and higher quality than forcing a
 *  global one) plus the standard LSB-first variable-width LZW.
 *
 *  Everything here is pure and DOM-free: frames go in as RGBA bytes, a
 *  `Uint8Array` of GIF comes out. That is what makes it unit-testable — the
 *  test suite decodes the output with an independent implementation.
 */

export interface GifFrame {
  /** RGBA, `width * height * 4` bytes. */
  readonly rgba: Uint8ClampedArray;
  /** Frame duration in milliseconds. GIF stores hundredths of a second. */
  readonly delayMs: number;
}

export interface GifOptions {
  readonly width: number;
  readonly height: number;
  /** 0 = loop forever (default). */
  readonly loop?: number;
  /** Maximum colours per frame, 2–256. Lower is smaller and faster. */
  readonly maxColors?: number;
}

interface Quantised {
  readonly palette: readonly (readonly [number, number, number])[];
  readonly indices: Uint8Array;
}

/* -------------------------------------------------------------------------- */
/*  Colour quantisation (median cut)                                          */
/* -------------------------------------------------------------------------- */

interface Box {
  readonly pixels: number[];
  /** Channel index with the widest spread — the axis we split on. */
  readonly axis: 0 | 1 | 2;
  readonly spread: number;
}

function packPixel(rgba: Uint8ClampedArray, pixel: number): number {
  const offset = pixel * 4;
  // Full 8-bit precision: flat UI colours must survive the round trip exactly,
  // and truncating to 5 bits would shift every neon accent by a few levels.
  const r = rgba[offset] ?? 0;
  const g = rgba[offset + 1] ?? 0;
  const b = rgba[offset + 2] ?? 0;
  return (r << 16) | (g << 8) | b;
}

function widestAxis(pixels: readonly number[]): { axis: 0 | 1 | 2; spread: number } {
  let minR = 255;
  let maxR = 0;
  let minG = 255;
  let maxG = 0;
  let minB = 255;
  let maxB = 0;
  for (const packed of pixels) {
    const r = (packed >> 16) & 255;
    const g = (packed >> 8) & 255;
    const b = packed & 255;
    if (r < minR) minR = r;
    if (r > maxR) maxR = r;
    if (g < minG) minG = g;
    if (g > maxG) maxG = g;
    if (b < minB) minB = b;
    if (b > maxB) maxB = b;
  }
  const spreadR = maxR - minR;
  const spreadG = maxG - minG;
  const spreadB = maxB - minB;
  if (spreadR >= spreadG && spreadR >= spreadB) return { axis: 0, spread: spreadR };
  if (spreadG >= spreadB) return { axis: 1, spread: spreadG };
  return { axis: 2, spread: spreadB };
}

function channelOf(packed: number, axis: 0 | 1 | 2): number {
  if (axis === 0) return (packed >> 16) & 255;
  if (axis === 1) return (packed >> 8) & 255;
  return packed & 255;
}

function averageColor(pixels: readonly number[]): [number, number, number] {
  let r = 0;
  let g = 0;
  let b = 0;
  for (const packed of pixels) {
    r += (packed >> 16) & 255;
    g += (packed >> 8) & 255;
    b += packed & 255;
  }
  const n = Math.max(1, pixels.length);
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
}

/** Median-cut palette for one frame, plus a per-pixel index map. */
export function quantiseFrame(rgba: Uint8ClampedArray, maxColors = 128): Quantised {
  const pixelCount = Math.floor(rgba.length / 4);
  if (pixelCount === 0) return { palette: [[0, 0, 0]], indices: new Uint8Array(0) };

  // Sample at most ~16k pixels: plenty for choosing 128 colours, and this is
  // what keeps a 60-frame export interactive instead of a coffee break.
  const sampleStep = Math.max(1, Math.floor(pixelCount / 16384));
  const samples: number[] = [];
  for (let pixel = 0; pixel < pixelCount; pixel += sampleStep) {
    samples.push(packPixel(rgba, pixel));
  }

  let boxes: Box[] = [makeBox(samples)];
  const target = Math.max(2, Math.min(256, maxColors));

  while (boxes.length < target) {
    // Split the box with the widest colour spread; stop when nothing can be
    // divided any further (every box holds a single colour).
    let index = -1;
    let best = 0;
    for (let i = 0; i < boxes.length; i += 1) {
      const box = boxes[i] as Box;
      if (box.pixels.length < 2) continue;
      if (box.spread > best) {
        best = box.spread;
        index = i;
      }
    }
    if (index < 0 || best === 0) break;

    const box = boxes[index] as Box;
    const sorted = [...box.pixels].sort((a, b) => channelOf(a, box.axis) - channelOf(b, box.axis));
    const middle = Math.floor(sorted.length / 2);
    const left = sorted.slice(0, middle);
    const right = sorted.slice(middle);
    if (left.length === 0 || right.length === 0) break;
    boxes = [...boxes.slice(0, index), makeBox(left), makeBox(right), ...boxes.slice(index + 1)];
  }

  const palette = boxes.map((box) => averageColor(box.pixels));
  const indices = new Uint8Array(pixelCount);
  const cache = new Map<number, number>();

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const packed = packPixel(rgba, pixel);
    const cached = cache.get(packed);
    if (cached !== undefined) {
      indices[pixel] = cached;
      continue;
    }
    const r = (packed >> 16) & 255;
    const g = (packed >> 8) & 255;
    const b = packed & 255;
    let nearest = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (let p = 0; p < palette.length; p += 1) {
      const colour = palette[p] as readonly [number, number, number];
      const dr = colour[0] - r;
      const dg = colour[1] - g;
      const db = colour[2] - b;
      const distance = dr * dr + dg * dg + db * db;
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = p;
      }
    }
    cache.set(packed, nearest);
    indices[pixel] = nearest;
  }

  return { palette, indices };
}

function makeBox(pixels: readonly number[]): Box {
  const { axis, spread } = widestAxis(pixels);
  return { pixels: [...pixels], axis, spread };
}

/* -------------------------------------------------------------------------- */
/*  LZW (GIF variant)                                                          */
/* -------------------------------------------------------------------------- */

const MAX_CODE = 4096;

/**
 * LSB-first variable-width LZW, exactly as GIF specifies it: a clear code to
 * start, codes growing from `minCodeSize + 1` bits to 12, and a clear code
 * again whenever the dictionary fills.
 */
export function lzwEncode(indices: Uint8Array, minCodeSize: number): Uint8Array {
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;
  const out: number[] = [];

  let codeSize = minCodeSize + 1;
  let bitBuffer = 0;
  let bitCount = 0;

  const emit = (code: number): void => {
    bitBuffer |= code << bitCount;
    bitCount += codeSize;
    while (bitCount >= 8) {
      out.push(bitBuffer & 0xff);
      bitBuffer >>= 8;
      bitCount -= 8;
    }
  };

  const dictionary = new Map<number, number>();
  let next = endCode + 1;

  emit(clearCode);

  if (indices.length === 0) {
    emit(endCode);
    if (bitCount > 0) out.push(bitBuffer & 0xff);
    return Uint8Array.from(out);
  }

  let prefix = indices[0] as number;

  for (let i = 1; i < indices.length; i += 1) {
    const suffix = indices[i] as number;
    const key = (prefix << 8) | suffix;
    const known = dictionary.get(key);
    if (known !== undefined) {
      prefix = known;
      continue;
    }
    emit(prefix);
    dictionary.set(key, next);
    next += 1;
    if (next > MAX_CODE - 1) {
      emit(clearCode);
      dictionary.clear();
      next = endCode + 1;
      codeSize = minCodeSize + 1;
    } else if (next > 1 << codeSize && codeSize < 12) {
      // The decoder builds its dictionary one code behind the encoder, so the
      // width must grow one step later than the dictionary index suggests.
      codeSize += 1;
    }
    prefix = suffix;
  }

  emit(prefix);
  emit(endCode);
  if (bitCount > 0) out.push(bitBuffer & 0xff);

  return Uint8Array.from(out);
}

/* -------------------------------------------------------------------------- */
/*  Container                                                                  */
/* -------------------------------------------------------------------------- */

function pushShort(out: number[], value: number): void {
  out.push(value & 0xff, (value >> 8) & 0xff);
}

/** Packs an LZW stream into GIF's length-prefixed sub-blocks. */
function pushSubBlocks(out: number[], data: Uint8Array): void {
  let offset = 0;
  while (offset < data.length) {
    const size = Math.min(255, data.length - offset);
    out.push(size);
    for (let i = 0; i < size; i += 1) out.push(data[offset + i] as number);
    offset += size;
  }
  out.push(0x00);
}

/** Nearest power of two ≥ `size`, minimum 2 — the colour table size GIF stores. */
function tableSize(size: number): number {
  let bits = 1;
  while (1 << bits < size) bits += 1;
  return bits;
}

/**
 * Encodes RGBA frames into a looping GIF89a byte stream.
 *
 * Each frame gets its own local colour table: an animated code visualiser
 * changes appearance a lot between frames, and a single global table would make
 * every frame pay for the worst frame's palette.
 */
export function encodeGif(frames: readonly GifFrame[], options: GifOptions): Uint8Array {
  const { width, height } = options;
  const out: number[] = [];

  // Header + logical screen descriptor (ignored fields set to 0).
  for (const char of 'GIF89a') out.push(char.charCodeAt(0));
  pushShort(out, width);
  pushShort(out, height);
  out.push(0x00, 0x00, 0x00);

  // NETSCAPE2.0 application extension → loop count.
  out.push(0x21, 0xff, 0x0b);
  for (const char of 'NETSCAPE2.0') out.push(char.charCodeAt(0));
  out.push(0x03, 0x01);
  pushShort(out, options.loop ?? 0);
  out.push(0x00);

  for (const frame of frames) {
    const { palette, indices } = quantiseFrame(frame.rgba, options.maxColors ?? 128);
    const bits = tableSize(palette.length);
    const tableLength = 1 << bits;
    const delay = Math.max(2, Math.round(frame.delayMs / 10));

    // Graphic control extension: disposal 2 (restore to background) keeps
    // frames from smearing into each other.
    out.push(0x21, 0xf9, 0x04, 0x08);
    pushShort(out, delay);
    out.push(0x00, 0x00);

    // Image descriptor + local colour table.
    out.push(0x2c);
    pushShort(out, 0);
    pushShort(out, 0);
    pushShort(out, width);
    pushShort(out, height);
    out.push(0x80 | (bits - 1));

    for (let i = 0; i < tableLength; i += 1) {
      const colour = palette[i];
      if (colour) {
        out.push(colour[0], colour[1], colour[2]);
      } else {
        out.push(0, 0, 0);
      }
    }

    const minCodeSize = Math.max(2, bits);
    out.push(minCodeSize);
    pushSubBlocks(out, lzwEncode(indices, minCodeSize));
  }

  out.push(0x3b); // trailer
  return Uint8Array.from(out);
}
