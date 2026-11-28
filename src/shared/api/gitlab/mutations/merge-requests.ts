import { approveMergeRequest } from '../endpoints/merge-requests/approvals/approve-merge-request';
import { cancelMergeRequestRequestedChanges } from '../endpoints/merge-requests/approvals/cancel-merge-request-requested-changes';
import { requestMergeRequestChanges } from '../endpoints/merge-requests/approvals/request-merge-request-changes';
import { unapproveMergeRequest } from '../endpoints/merge-requests/approvals/unapprove-merge-request';
import { createMergeRequestDiffDiscussion } from '../endpoints/merge-requests/discussions/mutations/create-merge-request-diff-discussion';
import { createMergeRequestDiscussion } from '../endpoints/merge-requests/discussions/mutations/create-merge-request-discussion';
import { createMergeRequestDiscussionNote } from '../endpoints/merge-requests/discussions/mutations/create-merge-request-discussion-note';
import { deleteMergeRequestDiscussionNote } from '../endpoints/merge-requests/discussions/mutations/delete-merge-request-discussion-note';
import { resolveMergeRequestDiscussion } from '../endpoints/merge-requests/discussions/mutations/resolve-merge-request-discussion';
import { updateMergeRequestDiscussionNote } from '../endpoints/merge-requests/discussions/mutations/update-merge-request-discussion-note';
import { closeMergeRequest } from '../endpoints/merge-requests/lifecycle/close-merge-request';
import {
  cancelAutoMerge,
  mergeMergeRequest,
} from '../endpoints/merge-requests/lifecycle/merge-merge-request';
import {
  changeMergeRequestLabel,
  createProjectLabel,
} from '../endpoints/merge-requests/metadata/labels';
import {
  changeMergeRequestReviewer,
  requestMergeRequestRereview,
} from '../endpoints/merge-requests/metadata/reviewers';
import { saveMergeRequestNote } from '../endpoints/merge-requests/notes/save-merge-request-note';
import { defineGitlabMutation } from './define-mutation';

export const mergeRequestMutations = {
  createMergeRequestDiffDiscussion: defineGitlabMutation(
    'createMergeRequestDiffDiscussion',
    createMergeRequestDiffDiscussion,
  ),
  createMergeRequestDiscussionNote: defineGitlabMutation(
    'createMergeRequestDiscussionNote',
    createMergeRequestDiscussionNote,
  ),
  createMergeRequestDiscussion: defineGitlabMutation(
    'createMergeRequestDiscussion',
    createMergeRequestDiscussion,
  ),
  saveMergeRequestNote: defineGitlabMutation(
    'saveMergeRequestNote',
    saveMergeRequestNote,
  ),
  deleteMergeRequestDiscussionNote: defineGitlabMutation(
    'deleteMergeRequestDiscussionNote',
    deleteMergeRequestDiscussionNote,
  ),
  resolveMergeRequestDiscussion: defineGitlabMutation(
    'resolveMergeRequestDiscussion',
    resolveMergeRequestDiscussion,
  ),
  updateMergeRequestDiscussionNote: defineGitlabMutation(
    'updateMergeRequestDiscussionNote',
    updateMergeRequestDiscussionNote,
  ),
  approveMergeRequest: defineGitlabMutation(
    'approveMergeRequest',
    approveMergeRequest,
  ),
  closeMergeRequest: defineGitlabMutation(
    'closeMergeRequest',
    closeMergeRequest,
  ),
  cancelAutoMerge: defineGitlabMutation('cancelAutoMerge', cancelAutoMerge),
  mergeMergeRequest: defineGitlabMutation(
    'mergeMergeRequest',
    mergeMergeRequest,
  ),
  unapproveMergeRequest: defineGitlabMutation(
    'unapproveMergeRequest',
    unapproveMergeRequest,
  ),
  requestMergeRequestChanges: defineGitlabMutation(
    'requestMergeRequestChanges',
    requestMergeRequestChanges,
  ),
  cancelMergeRequestRequestedChanges: defineGitlabMutation(
    'cancelMergeRequestRequestedChanges',
    cancelMergeRequestRequestedChanges,
  ),
  changeMergeRequestLabel: defineGitlabMutation(
    'changeMergeRequestLabel',
    changeMergeRequestLabel,
  ),
  createProjectLabel: defineGitlabMutation(
    'createProjectLabel',
    createProjectLabel,
  ),
  changeMergeRequestReviewer: defineGitlabMutation(
    'changeMergeRequestReviewer',
    changeMergeRequestReviewer,
  ),
  requestMergeRequestRereview: defineGitlabMutation(
    'requestMergeRequestRereview',
    requestMergeRequestRereview,
  ),
};
