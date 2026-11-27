import { isPipelineActive } from './is-pipeline-active';

export const pipelineJobAction = (status: string) => {
  if (status === 'manual') return 'play';
  if (status === 'failed' || status === 'canceled' || status === 'success')
    return 'retry';
  if (isPipelineActive(status) && status !== 'canceling') return 'cancel';
  return null;
};
