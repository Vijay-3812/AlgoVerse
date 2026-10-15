import { describe, expect, it } from 'vitest';
import { encodeGif, lzwEncode, quantiseFrame } from './gif';

/**
 * A deliberately independent decoder.
 *
 * The point of these tests is not "our encoder agrees with itself" — it is that
 * a *separately written* implementation of the GIF spec can read our bytes
 * back. If the two ever disagree about code widths, block framing or palette
 * sizing, this fails.
 */

interface DecodedFrame {
  readonly width: number;
  readonly height: number;
  readonly delayMs: number;
  readonly palette: readonly (readonly [number, number, number])[];
  readonly indices: Uint8Array;
}

function lzwDecode(data: Uint8Array, minCodeSize: number, pixelCount: number): number[] {
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;

  let dictionary: number[][] = [];
  const resetDictionary = (): void => {
    dictionary = [];
    for (let i = 0; i < clearCode; i += 1) dictionary.push([i]);
    dictionary.push([], []);
  };
  resetDictionary();

  let codeSize = minCodeSize + 1;
  let bitBuffer = 0;
  let bitCount = 0;
  let offset = 0;
  const out: number[] = [];
  let previous: number[] | null = null;

  const readCode = (): number | null => {
    while (bitCount < codeSize) {
      if (offset >= data.length) return null;
      bitBuffer |= (data[offset] as number) << bitCount;
      bitCount += 8;
      offset += 1;
    }
    const code = bitBuffer & ((1 << codeSize) - 1);
    bitBuffer >>= codeSize;
    bitCount -= codeSize;
    return code;
  };

  for (;;) {
    const code = readCode();
    if (code === null) break;
    if (code === clearCode) {
      resetDictionary();
      codeSize = minCodeSize + 1;
      previous = null;
      continue;
    }
    if (code === endCode) break;

    let entry: number[];
    if (code < dictionary.length) {
      entry = dictionary[code] as number[];
    } else if (previous) {
      entry = [...previous, previous[0] as number];
    } else {
      throw new Error(`invalid code ${code}`);
    }

    out.push(...entry);
    if (previous) {
      dictionary.push([...previous, entry[0] as number]);
      // The decoder widens one code *after* adding, mirroring the encoder.
      if (dictionary.length === (1 << codeSize) && codeSize < 12) codeSize += 1;
    }
    previous = entry;
    if (out.length >= pixelCount) break;
  }

  return out.slice(0, pixelCount);
}

/** Minimal GIF89a walker: enough to read back what `encodeGif` writes. */
function parseGif(bytes: Uint8Array): { width: number; height: number; frames: DecodedFrame[] } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let cursor = 0;
  const readByte = (): number => bytes[cursor++] as number;
  const readShort = (): number => {
    const value = view.getUint16(cursor, true);
    cursor += 2;
    return value;
  };

  const signature = String.fromCharCode(...bytes.slice(0, 6));
  expect(signature).toBe('GIF89a');
  cursor = 6;

  const width = readShort();
  const height = readShort();
  const packed = readByte();
  readByte(); // background colour index
  readByte(); // pixel aspect ratio
  if (packed & 0x80) {
    const entries = 1 << ((packed & 0x07) + 1);
    cursor += entries * 3;
  }

  const frames: DecodedFrame[] = [];
  let pendingDelay = 100;

  while (cursor < bytes.length) {
    const marker = readByte();

    if (marker === 0x3b) break;

    if (marker === 0x21) {
      const label = readByte();
      if (label === 0xf9) {
        const size = readByte();
        const flags = readByte();
        pendingDelay = readShort() * 10;
        expect(flags & 0x1c).toBe(0x08); // disposal method 2
        cursor += size - 3; // remaining GCE payload
        expect(readByte()).toBe(0); // block terminator
      } else {
        // Skip any other extension: sub-blocks until a zero-length block.
        const size = readByte();
        cursor += size;
        for (;;) {
          const length = readByte();
          if (length === 0) break;
          cursor += length;
        }
      }
      continue;
    }

    if (marker !== 0x2c) throw new Error(`unexpected block 0x${marker.toString(16)}`);

    const frameLeft = readShort();
    const frameTop = readShort();
    const frameWidth = readShort();
    const frameHeight = readShort();
    const framePacked = readByte();
    expect(frameLeft).toBe(0);
    expect(frameTop).toBe(0);
    expect(frameWidth).toBe(width);
    expect(frameHeight).toBe(height);

    let palette: [number, number, number][] = [];
    if (framePacked & 0x80) {
      const entries = 1 << ((framePacked & 0x07) + 1);
      for (let i = 0; i < entries; i += 1) {
        palette.push([readByte(), readByte(), readByte()]);
      }
    }

    const minCodeSize = readByte();
    const data: number[] = [];
    for (;;) {
      const length = readByte();
      if (length === 0) break;
      for (let i = 0; i < length; i += 1) data.push(readByte());
    }

    const indices = Uint8Array.from(lzwDecode(Uint8Array.from(data), minCodeSize, width * height));
    frames.push({ width, height, delayMs: pendingDelay, palette, indices });
  }

  return { width, height, frames };
}

function flatImage(colors: readonly (readonly [number, number, number])[]): Uint8ClampedArray {
  // 8×4 image, each column a solid colour from the list.
  const width = 8;
  const height = 4;
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const colour = colors[x % colors.length] as readonly [number, number, number];
      const offset = (y * width + x) * 4;
      rgba[offset] = colour[0];
      rgba[offset + 1] = colour[1];
      rgba[offset + 2] = colour[2];
      rgba[offset + 3] = 255;
    }
  }
  return rgba;
}

describe('gif encoder', () => {
  it('lzw round-trips through an independent decoder', () => {
    const indices = new Uint8Array(4096);
    // Pseudo-random but deterministic, with plenty of runs and repeats so the
    // dictionary grows past 9, 10 and 11 bits.
    let state = 7;
    for (let i = 0; i < indices.length; i += 1) {
      state = (state * 1103515245 + 12345) % 2147483648;
      indices[i] = (state >> 16) % 64;
    }
    const encoded = lzwEncode(indices, 6);
    // 64 pseudo-random symbols do not compress — the point of this test is the
    // round trip, not the ratio.
    expect(encoded.byteLength).toBeGreaterThan(0);
    const decoded = lzwDecode(encoded, 6, indices.length);
    expect(decoded.length).toBe(indices.length);
    expect(Array.from(decoded)).toEqual(Array.from(indices));
  });

  it('quantises to at most the requested number of colours and stays in range', () => {
    const colours: [number, number, number][] = [
      [0, 245, 255],
      [139, 92, 246],
      [255, 46, 151],
      [163, 255, 18],
      [10, 11, 18],
      [26, 29, 46],
    ];
    const rgba = flatImage(colours);
    const { palette, indices } = quantiseFrame(rgba, 4);
    expect(palette.length).toBeLessThanOrEqual(4);
    expect(palette.length).toBeGreaterThan(0);
    for (const index of indices) expect(index).toBeLessThan(palette.length);
  });

  it('encodes a two-frame GIF that decodes back to the original pixels', () => {
    const frameA = flatImage([
      [0, 245, 255],
      [139, 92, 246],
      [255, 46, 151],
      [163, 255, 18],
    ]);
    const frameB = flatImage([
      [163, 255, 18],
      [255, 46, 151],
      [139, 92, 246],
      [0, 245, 255],
    ]);

    const bytes = encodeGif(
      [
        { rgba: frameA, delayMs: 120 },
        { rgba: frameB, delayMs: 340 },
      ],
      { width: 8, height: 4, loop: 0 },
    );

    const bytesList = Array.from(bytes);
    expect(bytesList.slice(0, 6)).toEqual([...'GIF89a'].map((c) => c.charCodeAt(0)));
    expect(bytesList.slice(-1)).toEqual([0x3b]);
    // NETSCAPE2.0 loop extension must be present for looping animations.
    expect(bytesList.join(',')).toContain([...'NETSCAPE2.0'].map((c) => c.charCodeAt(0)).join(','));

    const parsed = parseGif(bytes);
    expect(parsed.width).toBe(8);
    expect(parsed.height).toBe(4);
    expect(parsed.frames).toHaveLength(2);
    expect(parsed.frames[0]?.delayMs).toBe(120);
    expect(parsed.frames[1]?.delayMs).toBe(340);

    for (const [frameIndex, source] of [frameA, frameB].entries()) {
      const frame = parsed.frames[frameIndex];
      expect(frame).toBeDefined();
      if (!frame) continue;
      for (let pixel = 0; pixel < 8 * 4; pixel += 1) {
        const paletteEntry = frame.palette[frame.indices[pixel] as number];
        expect(paletteEntry).toBeDefined();
        if (!paletteEntry) continue;
        const offset = pixel * 4;
        expect(paletteEntry[0]).toBe(source[offset]);
        expect(paletteEntry[1]).toBe(source[offset + 1]);
        expect(paletteEntry[2]).toBe(source[offset + 2]);
      }
    }
  });

  it('handles an empty frame list without writing a malformed file', () => {
    const bytes = encodeGif([], { width: 4, height: 4 });
    expect(Array.from(bytes.slice(0, 6))).toEqual([...'GIF89a'].map((c) => c.charCodeAt(0)));
    expect(bytes[bytes.length - 1]).toBe(0x3b);
  });
});
