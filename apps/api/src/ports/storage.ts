import { Buffer } from 'node:buffer';
import { existsSync } from 'node:fs';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  ALLOWED_COVER_EXTENSIONS,
  ALLOWED_COVER_MIME_TYPES,
  API_MESSAGES,
  MAX_COVER_SIZE_BYTES,
} from '@readonly/shared';
import { createValidationError } from '../shared/errors';

export interface StoragePort {
  uploadCover(fileName: string, body: Buffer): Promise<string>;
  getCoverUrl(relativePath: string): string;
  detachCover(relativePath: string): Promise<void>;
  readCover?(
    fileName: string,
  ): Promise<{ data: Buffer; mimeType: string } | null>;
}

export function detectImageFormat(
  buffer: Buffer,
): { ext: string; mimeType: string } | null {
  if (buffer.length >= 8) {
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return { ext: '.png', mimeType: 'image/png' };
    }
  }

  if (buffer.length >= 3) {
    // JPEG signature: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return { ext: '.jpg', mimeType: 'image/jpeg' };
    }
  }

  return null;
}

export async function validateAndExtractCover(
  coverInput: unknown,
): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
  if (
    !coverInput ||
    typeof coverInput !== 'object' ||
    !('arrayBuffer' in coverInput) ||
    typeof (coverInput as { arrayBuffer: unknown }).arrayBuffer !== 'function'
  ) {
    throw createValidationError(API_MESSAGES.FIELD_REQUIRED, 'cover');
  }

  const file = coverInput as {
    name?: string;
    type?: string;
    size?: number;
    arrayBuffer(): Promise<ArrayBuffer>;
  };

  const originalName = typeof file.name === 'string' ? file.name : '';
  const rawExt = path.extname(originalName).toLowerCase();
  const rawType =
    typeof file.type === 'string'
      ? file.type.split(';')[0]?.trim().toLowerCase()
      : '';

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (buffer.length > MAX_COVER_SIZE_BYTES) {
    throw createValidationError(API_MESSAGES.COVER_SIZE_LIMIT, 'cover');
  }

  const isAllowedExt = (ALLOWED_COVER_EXTENSIONS as readonly string[]).includes(
    rawExt,
  );
  const isAllowedMime = (
    ALLOWED_COVER_MIME_TYPES as readonly string[]
  ).includes(rawType);

  if (!isAllowedExt || !isAllowedMime) {
    throw createValidationError(API_MESSAGES.COVER_INVALID_FORMAT, 'cover');
  }

  const detected = detectImageFormat(buffer);
  if (!detected) {
    throw createValidationError(API_MESSAGES.COVER_INVALID_FORMAT, 'cover');
  }

  // Cross-check detected extension family with filename extension
  if (detected.ext === '.png' && rawExt !== '.png') {
    throw createValidationError(API_MESSAGES.COVER_INVALID_FORMAT, 'cover');
  }
  if (detected.ext === '.jpg' && rawExt !== '.jpg' && rawExt !== '.jpeg') {
    throw createValidationError(API_MESSAGES.COVER_INVALID_FORMAT, 'cover');
  }

  const randomId = crypto.randomUUID();
  const fileName = `${randomId}${rawExt === '.jpeg' ? '.jpeg' : detected.ext}`;

  return {
    buffer,
    fileName,
    mimeType: detected.mimeType,
  };
}

export class MemoryStorageAdapter implements StoragePort {
  private readonly files = new Map<
    string,
    { data: Buffer; mimeType: string }
  >();

  constructor(private readonly publicUrlPrefix = '/api/v1/covers') {}

  async uploadCover(fileName: string, body: Buffer): Promise<string> {
    const detected = detectImageFormat(body);
    const mimeType = detected?.mimeType ?? 'image/jpeg';
    this.files.set(fileName, { data: body, mimeType });
    return fileName;
  }

  getCoverUrl(relativePath: string): string {
    if (!relativePath || relativePath.trim().length === 0) {
      return '';
    }
    const clean = relativePath.replace(/^(\/api\/v1\/covers\/|\/)+/, '');
    return `${this.publicUrlPrefix}/${clean}`;
  }

  async detachCover(relativePath: string): Promise<void> {
    if (!relativePath) {
      return;
    }
    const clean = relativePath.replace(/^(\/api\/v1\/covers\/|\/)+/, '');
    this.files.delete(clean);
  }

  async readCover(
    fileName: string,
  ): Promise<{ data: Buffer; mimeType: string } | null> {
    const clean = path.basename(fileName);
    return this.files.get(clean) ?? null;
  }
}

export class DiskStorageAdapter implements StoragePort {
  constructor(
    private readonly storageDir = process.env.COVER_STORAGE_PATH ||
      'storage/covers',
    private readonly publicUrlPrefix = '/api/v1/covers',
  ) {}

  async uploadCover(fileName: string, body: Buffer): Promise<string> {
    const cleanName = path.basename(fileName);
    await mkdir(this.storageDir, { recursive: true });
    await writeFile(path.join(this.storageDir, cleanName), body);
    return cleanName;
  }

  getCoverUrl(relativePath: string): string {
    if (!relativePath || relativePath.trim().length === 0) {
      return '';
    }
    const clean = relativePath.replace(/^(\/api\/v1\/covers\/|\/)+/, '');
    return `${this.publicUrlPrefix}/${clean}`;
  }

  async detachCover(relativePath: string): Promise<void> {
    if (!relativePath) {
      return;
    }
    const cleanName = path.basename(relativePath);
    const targetPath = path.join(this.storageDir, cleanName);
    try {
      await unlink(targetPath);
    } catch {
      // File may not exist or already unlinked
    }
  }

  async readCover(
    fileName: string,
  ): Promise<{ data: Buffer; mimeType: string } | null> {
    const cleanName = path.basename(fileName);
    const targetPath = path.join(this.storageDir, cleanName);
    if (!existsSync(targetPath)) {
      return null;
    }

    const data = await readFile(targetPath);
    const detected = detectImageFormat(data);
    const ext = path.extname(cleanName).toLowerCase();
    const mimeType =
      detected?.mimeType ?? (ext === '.png' ? 'image/png' : 'image/jpeg');

    return { data, mimeType };
  }
}
