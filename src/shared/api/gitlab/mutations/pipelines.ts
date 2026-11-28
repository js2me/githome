import { cancelPipeline } from '../endpoints/pipelines/cancel-pipeline';
import { createPipeline } from '../endpoints/pipelines/create-pipeline';
import { cancelPipelineJob } from '../endpoints/pipelines/jobs/cancel-pipeline-job';
import { playPipelineJob } from '../endpoints/pipelines/jobs/play-pipeline-job';
import { retryPipelineJob } from '../endpoints/pipelines/jobs/retry-pipeline-job';
import { retryPipeline } from '../endpoints/pipelines/retry-pipeline';
import { defineGitlabMutation } from './define-mutation';

export const pipelineMutations = {
  createPipeline: defineGitlabMutation('createPipeline', createPipeline),
  cancelPipeline: defineGitlabMutation('cancelPipeline', cancelPipeline),
  retryPipeline: defineGitlabMutation('retryPipeline', retryPipeline),
  cancelPipelineJob: defineGitlabMutation(
    'cancelPipelineJob',
    cancelPipelineJob,
  ),
  playPipelineJob: defineGitlabMutation('playPipelineJob', playPipelineJob),
  retryPipelineJob: defineGitlabMutation('retryPipelineJob', retryPipelineJob),
};
