import type { Buffer } from 'node:buffer';

export interface StoragePort {
  uploadCover(fileName: string, body: Buffer): Promise<string>;
  getCoverUrl(relativePath: string): string;
  detachCover(relativePath: string): Promise<void>;
}
