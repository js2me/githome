import { isPipelineActive } from './is-pipeline-active';

export type PipelineJobAction = 'play' | 'retry' | 'cancel';

export const pipelineJobAction = (status: string): PipelineJobAction | null => {
  if (status === 'manual') return 'play';
  if (status === 'failed' || status === 'canceled' || status === 'success')
    return 'retry';
  if (isPipelineActive(status) && status !== 'canceling') return 'cancel';
  return null;
};
