/**
 * What an uploaded file actually is, read from its first bytes.
 *
 * Upload routes used to trust File.type, which is whatever the browser (or a
 * script) says. The detected type is what gets stored and served, so a file
 * labelled image/png that is really HTML or SVG is refused rather than
 * published under our name.
 */

export const MEDIA_MAX_BYTES = 5 * 1024 * 1024;

export type MediaKind = 'image' | 'video';

export interface SniffedMedia {
  mime: string;
  kind: MediaKind;
  ext: string;
}

export function sniffMedia(buf: Buffer): SniffedMedia | null {
  if (buf.length < 12) return null;
  const ascii = (a: number, b: number) => buf.subarray(a, b).toString('latin1');

  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', kind: 'image', ext: 'jpg' };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: 'image/png', kind: 'image', ext: 'png' };
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return { mime: 'image/webp', kind: 'image', ext: 'webp' };
  if (ascii(0, 6) === 'GIF87a' || ascii(0, 6) === 'GIF89a') return { mime: 'image/gif', kind: 'image', ext: 'gif' };

  // ISO base media (MP4 / MOV): "ftyp" at offset 4, brand after it.
  if (ascii(4, 8) === 'ftyp') {
    const brand = ascii(8, 12);
    if (brand === 'qt  ') return { mime: 'video/quicktime', kind: 'video', ext: 'mov' };
    // HEIC/AVIF photos share the container; they are not videos.
    if (/^(heic|heix|hevc|mif1|msf1|avif)$/.test(brand)) return null;
    return { mime: 'video/mp4', kind: 'video', ext: 'mp4' };
  }
  // EBML header: WebM / Matroska.
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) {
    return buf.includes(Buffer.from('webm')) ? { mime: 'video/webm', kind: 'video', ext: 'webm' } : { mime: 'video/x-matroska', kind: 'video', ext: 'mkv' };
  }
  if (ascii(0, 4) === 'OggS') return { mime: 'video/ogg', kind: 'video', ext: 'ogv' };
  return null;
}
