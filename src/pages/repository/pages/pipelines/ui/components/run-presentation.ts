import type { GitLabPipelineDC } from '@/shared/api/gitlab';
import type { PipelinesPageVM } from '../../model';

export const durationLabel = (seconds?: number | null) => {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return null;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return minutes > 0 ? `${minutes} мин ${rest} с` : `${rest} с`;
};

export const errorText = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export const control =
  'glass-control inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold';

export type RunProps = { model: PipelinesPageVM; run: GitLabPipelineDC };
