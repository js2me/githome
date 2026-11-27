import type { GitLabPipelineDC } from '@/shared/api/gitlab';
import type { PipelinesPageVM } from '../../model';

export const errorText = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export const control =
  'glass-control inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold';

export type RunProps = { model: PipelinesPageVM; run: GitLabPipelineDC };
