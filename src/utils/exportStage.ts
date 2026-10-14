import type { AnyStep, AnyTrace, Theme } from '@/types';
import { stageToSvg, type StageSvgOptions } from '@/utils/exportSvg';
import { encodeGif, type GifFrame } from '@/utils/gif';
import { toast } from '@/store/toastStore';

/**
 * ---------------------------------------------------------------------------
 *  EXPORT — SVG → PNG → GIF
 * ---------------------------------------------------------------------------
 *  The browser half of exporting. `exportSvg.ts` produces a standalone SVG
 *  string from a trace step; this module rasterises it with an `Image` and a
 *  canvas (safe: the SVG has no external references, so the canvas is never
 *  tainted) and hands the user a file.
 *
 *  Frames are sampled evenly across the trace rather than capturing one image
 *  per step: a 4 000-step quicksort would otherwise export 4 000 GIF frames and
 *  take a minute to encode.
 */

export interface ExportDimensions {
  readonly width: number;
  readonly height: number;
}

export const EXPORT_SIZE: ExportDimensions = { width: 1200, height: 675 };
const GIF_SIZE: ExportDimensions = { width: 640, height: 360 };

async function rasterise(svg: string, size: ExportDimensions, scale = 1): Promise<HTMLCanvasElement> {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.width = size.width;
    image.height = size.height;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('The export image could not be decoded.'));
      image.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(size.width * scale);
    canvas.height = Math.round(size.height * scale);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is unavailable in this browser.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Revoking immediately can cancel the download in some browsers.
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('The browser refused to encode the export.'));
    }, type);
  });
}

/** PNG of a single trace step. */
export async function exportStepPng(step: AnyStep, options: StageSvgOptions, filename: string): Promise<void> {
  const svg = stageToSvg(step, { ...options, ...EXPORT_SIZE });
  if (!svg) {
    toast.warning('Nothing to export', 'This step has no drawable snapshot.');
    return;
  }
  const canvas = await rasterise(svg, EXPORT_SIZE, 2);
  const blob = await canvasToBlob(canvas, 'image/png');
  download(blob, `${slug(filename)}.png`);
  toast.success('PNG exported', `${EXPORT_SIZE.width * 2}×${EXPORT_SIZE.height * 2} · step ${(options.step?.index ?? 0) + 1}`);
}

/** The SVG itself, for people who want to edit or scale it. */
export function exportStepSvg(step: AnyStep, options: StageSvgOptions, filename: string): void {
  const svg = stageToSvg(step, { ...options, ...EXPORT_SIZE });
  if (!svg) {
    toast.warning('Nothing to export', 'This step has no drawable snapshot.');
    return;
  }
  download(new Blob([svg], { type: 'image/svg+xml' }), `${slug(filename)}.svg`);
  toast.success('SVG exported', 'Vector — scale it as far as you like.');
}

export interface GifExportOptions {
  readonly theme: Theme;
  readonly title: string;
  readonly filename: string;
  /** Upper bound on frames; steps are sampled evenly across the trace. */
  readonly maxFrames?: number;
  /** Frame duration in milliseconds. */
  readonly delayMs?: number;
  readonly maxColors?: number;
}

/**
 * Animated GIF of the whole run.
 *
 * Steps are sampled evenly so the animation covers the entire algorithm no
 * matter how long the trace is, and each frame is rasterised at 640×360 to keep
 * both memory and the encoded file sane.
 */
export async function exportTraceGif(trace: AnyTrace, options: GifExportOptions): Promise<void> {
  const total = trace.steps.length;
  if (total === 0) {
    toast.warning('Nothing to export', 'This trace has no steps yet.');
    return;
  }

  const maxFrames = Math.max(4, options.maxFrames ?? 40);
  const frameCount = Math.min(total, maxFrames);
  const delayMs = options.delayMs ?? 110;
  const stepIndices = Array.from({ length: frameCount }, (_, index) =>
    frameCount === 1 ? 0 : Math.round((index / (frameCount - 1)) * (total - 1)),
  );

  const progressToast = toast.info(
    'Rendering GIF…',
    `${frameCount} frames sampled from ${total} steps. This takes a few seconds.`,
  );

  const frames: GifFrame[] = [];
  try {
    for (const stepIndex of stepIndices) {
      const step = trace.steps[stepIndex];
      if (!step) continue;
      const svg = stageToSvg(step, {
        theme: options.theme,
        title: options.title,
        step: { index: stepIndex, total },
        ...GIF_SIZE,
      });
      if (!svg) continue;
      const canvas = await rasterise(svg, GIF_SIZE, 1);
      const context = canvas.getContext('2d');
      if (!context) continue;
      const imageData = context.getImageData(0, 0, GIF_SIZE.width, GIF_SIZE.height);
      frames.push({ rgba: imageData.data, delayMs });
      // Yield to the browser so the toast can show progress and the tab keeps
      // responding (encoding 40 frames is otherwise a solid freeze).
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }
  } catch (cause) {
    toast.dismiss(progressToast);
    toast.error('GIF export failed', cause instanceof Error ? cause.message : 'Unknown error.');
    return;
  }

  if (frames.length === 0) {
    toast.dismiss(progressToast);
    toast.warning('Nothing to export', 'No frame could be rendered from this trace.');
    return;
  }

  const bytes = encodeGif(frames, { ...GIF_SIZE, maxColors: options.maxColors ?? 96, loop: 0 });
  download(new Blob([new Uint8Array(bytes)], { type: 'image/gif' }), `${slug(options.filename)}.gif`);
  toast.dismiss(progressToast);
  toast.success(
    'GIF exported',
    `${frames.length} frames · ${(bytes.byteLength / 1024 / 1024).toFixed(1)} MB · plays on a loop.`,
  );
}
