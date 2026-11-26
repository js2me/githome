import type { GitLabPipelineDC } from '@/shared/api/gitlab';
import { t } from '@/shared/lib/i18n';
import type { PipelinesPageVM } from '../../model';

export const durationLabel = (seconds?: number | null) => {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return null;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return minutes > 0
    ? t('pipelines.minS', { v1: minutes, v2: rest })
    : t('pipelines.s', { v1: rest });
};

export const errorText = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export const control =
  'glass-control inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold';

export type RunProps = { model: PipelinesPageVM; run: GitLabPipelineDC };
