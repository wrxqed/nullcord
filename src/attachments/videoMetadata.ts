import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import type { Dimensions } from './imageDimensions.js';

interface FfprobeOutput {
  streams?: Array<{
    width?: number;
    height?: number;
  }>;
}

export function probeVideoDimensions(filePath: string): Dimensions | null {
  try {
    const raw = execFileSync(
      'ffprobe',
      [
        '-v',
        'error',
        '-select_streams',
        'v:0',
        '-show_entries',
        'stream=width,height',
        '-of',
        'json',
        filePath,
      ],
      { encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'ignore'] },
    );

    const parsed = JSON.parse(raw) as FfprobeOutput;
    const stream = parsed.streams?.[0];
    if (
      stream &&
      typeof stream.width === 'number' &&
      typeof stream.height === 'number' &&
      stream.width > 0 &&
      stream.height > 0
    ) {
      return { width: stream.width, height: stream.height };
    }
    return null;
  } catch {
    return null;
  }
}

export function generateVideoPoster(videoPath: string, posterPath: string): boolean {
  if (fs.existsSync(posterPath)) {
    return true;
  }

  const timestamps = ['00:00:00.500', '00:00:00.000'];
  for (const ts of timestamps) {
    try {
      execFileSync(
        'ffmpeg',
        ['-y', '-ss', ts, '-i', videoPath, '-frames:v', '1', '-q:v', '80', posterPath],
        { timeout: 8000, stdio: 'ignore' },
      );
      if (fs.existsSync(posterPath) && fs.statSync(posterPath).size > 0) {
        return true;
      }
    } catch {
      continue;
    }
  }

  return false;
}
