import { uploadProjectMarkdown } from '../endpoints/markdown/upload-project-markdown';
import { defineGitlabMutation } from './define-mutation';

export const markdownMutations = {
  uploadProjectMarkdown: defineGitlabMutation(
    'uploadProjectMarkdown',
    uploadProjectMarkdown,
  ),
};
