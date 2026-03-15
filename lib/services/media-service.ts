import fs from 'node:fs/promises';
import path from 'node:path';

import { ApiError } from '@/lib/errors';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function imageExtByMime(mimeRaw: string): string {
  const mime = mimeRaw.toLowerCase();
  if (mime === 'image/png') return 'png';
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg';
  if (mime === 'image/webp') return 'webp';
  return '';
}

export async function saveImageToPublic(input: {
  file: File;
  prefix: string;
  relativeDir: string;
}): Promise<string> {
  const { file, prefix, relativeDir } = input;
  if (file.size <= 0 || file.size > MAX_IMAGE_SIZE) {
    throw new ApiError(400, '头像文件大小必须在 0-5MB');
  }
  const ext = imageExtByMime(file.type);
  if (!ext) {
    throw new ApiError(400, '头像仅支持 PNG/JPG/WEBP');
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const absoluteDir = path.join(process.cwd(), 'public', relativeDir);
  await fs.mkdir(absoluteDir, { recursive: true });

  const fileName = `${prefix}-${Date.now()}.${ext}`;
  const relativePath = `${relativeDir.replace(/\\/g, '/')}/${fileName}`;
  const absolutePath = path.join(absoluteDir, fileName);
  await fs.writeFile(absolutePath, bytes);
  return relativePath;
}

