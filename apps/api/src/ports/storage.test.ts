import { afterAll, describe, expect, it } from 'bun:test';
import { Buffer } from 'node:buffer';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import {
  DiskStorageAdapter,
  detectImageFormat,
  MemoryStorageAdapter,
  validateAndExtractCover,
} from './storage';

function createPngBlobPart(size = 100): BlobPart {
  const ab = new ArrayBuffer(Math.max(8, size));
  const u8 = new Uint8Array(ab);
  u8.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  return u8;
}

function createPngBuffer(size = 100): Buffer {
  return Buffer.from(createPngBlobPart(size) as Uint8Array);
}

function createJpegBuffer(size = 100): Buffer {
  const ab = new ArrayBuffer(Math.max(3, size));
  const u8 = new Uint8Array(ab);
  u8.set([0xff, 0xd8, 0xff], 0);
  return Buffer.from(u8);
}

describe('Storage Port and Adapters', () => {
  const testStorageDir = path.resolve(
    process.cwd(),
    `storage/test-covers-${crypto.randomUUID()}`,
  );

  afterAll(async () => {
    try {
      await rm(testStorageDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  it('detectImageFormat correctly identifies PNG and JPEG magic bytes', () => {
    expect(detectImageFormat(createPngBuffer())?.mimeType).toBe('image/png');
    expect(detectImageFormat(createJpegBuffer())?.mimeType).toBe('image/jpeg');
    expect(detectImageFormat(Buffer.from('not-an-image'))).toBeNull();
    expect(detectImageFormat(Buffer.from([]))).toBeNull();
  });

  it('DiskStorageAdapter writes, reads, gets public URL, and detaches cover', async () => {
    const adapter = new DiskStorageAdapter(testStorageDir, '/api/v1/covers');

    const png = createPngBuffer(128);
    const fileName = 'test-cover.png';

    const uploaded = await adapter.uploadCover(fileName, png);
    expect(uploaded).toBe('test-cover.png');

    const url = adapter.getCoverUrl(uploaded);
    expect(url).toBe('/api/v1/covers/test-cover.png');
    expect(adapter.getCoverUrl('')).toBe('');

    const read = await adapter.readCover(uploaded);
    expect(read).not.toBeNull();
    expect(read?.mimeType).toBe('image/png');
    expect(read?.data.length).toBe(png.length);

    await adapter.detachCover(uploaded);
    const afterDetach = await adapter.readCover(uploaded);
    expect(afterDetach).toBeNull();
  });

  it('MemoryStorageAdapter handles uploads, reads, URLs, and detaching', async () => {
    const adapter = new MemoryStorageAdapter('/api/v1/covers');

    const jpeg = createJpegBuffer(64);
    const fileName = 'photo.jpg';

    await adapter.uploadCover(fileName, jpeg);
    expect(adapter.getCoverUrl(fileName)).toBe('/api/v1/covers/photo.jpg');

    const read = await adapter.readCover(fileName);
    expect(read).not.toBeNull();
    expect(read?.mimeType).toBe('image/jpeg');

    await adapter.detachCover(fileName);
    expect(await adapter.readCover(fileName)).toBeNull();
  });

  it('validateAndExtractCover rejects non-file objects and invalid files', async () => {
    expect(validateAndExtractCover(null)).rejects.toThrow();
    expect(validateAndExtractCover({})).rejects.toThrow();

    const validFile = new File([createPngBlobPart()], 'valid.png', {
      type: 'image/png',
    });
    const result = await validateAndExtractCover(validFile);
    expect(result.mimeType).toBe('image/png');
    expect(result.fileName).toMatch(/\.png$/);
  });
});
