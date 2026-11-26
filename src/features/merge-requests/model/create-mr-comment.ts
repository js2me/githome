import { actionBound, computed, observable, runInAction } from 'mobx';
import type {
  GitLabDiscussionDC,
  GitLabMergeRequestDC,
  GitLabProjectDC,
} from '@/shared/api/gitlab';
import { gitlabApi } from '@/shared/api/gitlab';
import type { CreateDiffCommentInput } from '@/shared/lib/gitlab/discussions/diff-comment';
import { LocalizedError } from '@/shared/lib/i18n/localized-error';
import type { Globals } from '@/shared/model/globals';

export type CreateMrCommentContext = {
  project: GitLabProjectDC;
  mergeRequestIid: number;
};

export interface CreateMrCommentParams {
  globals: Globals;
  readonly params: () => CreateMrCommentContext | false;
  readonly getDiffRefs: () => GitLabMergeRequestDC['diff_refs'];
  readonly onDiscussionCreated: (discussion: GitLabDiscussionDC) => void;
}

export class CreateMrComment {
  @observable accessor isSubmitting = false;
  @observable private accessor submitErrorValue: Error | null = null;

  get submitError() {
    return this.submitErrorValue?.message ?? '';
  }

  constructor(private readonly options: CreateMrCommentParams) {}

  @computed
  get canComment() {
    const refs = this.options.getDiffRefs();
    return Boolean(refs?.base_sha && refs.head_sha && refs.start_sha);
  }

  @actionBound
  clearSubmitError() {
    this.submitErrorValue = null;
  }

  @actionBound
  async submit(input: CreateDiffCommentInput) {
    const connection = this.options.globals.stores.settings.activeConnection;
    const mr = this.options.params();
    const diffRefs = this.options.getDiffRefs();

    if (!connection || !mr) {
      this.submitErrorValue = new LocalizedError(
        'review.noMergeRequestSelected',
      );
      return false;
    }

    if (!diffRefs?.base_sha || !diffRefs.head_sha || !diffRefs.start_sha) {
      this.submitErrorValue = new LocalizedError(
        'review.cannotPostACommentWithoutDiffRefs',
      );
      return false;
    }

    if (!input.body.trim()) {
      this.submitErrorValue = new LocalizedError('review.enterAComment');
      return false;
    }

    this.isSubmitting = true;
    this.submitErrorValue = null;

    try {
      const discussion = await gitlabApi.createMergeRequestDiffDiscussion(
        connection,
        mr.project,
        mr.mergeRequestIid,
        {
          base_sha: diffRefs.base_sha,
          head_sha: diffRefs.head_sha,
          start_sha: diffRefs.start_sha,
        },
        {
          ...input,
          body: input.body.trim(),
        },
      );

      this.options.onDiscussionCreated(discussion);

      return true;
    } catch (error) {
      runInAction(() => {
        this.submitErrorValue =
          error instanceof Error
            ? error
            : new LocalizedError('review.couldNotPostTheComment');
      });
      return false;
    } finally {
      runInAction(() => {
        this.isSubmitting = false;
      });
    }
  }
}
