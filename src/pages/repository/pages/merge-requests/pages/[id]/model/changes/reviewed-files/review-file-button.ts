import {
  actionBound,
  compareShallow,
  computed,
  observableRef,
  reaction,
  runInAction,
} from 'mobx';
import type { GitLabMergeRequestChangeDC } from '@/shared/api/gitlab';
import { VM } from '@/shared/lib/view-models/vm';
import { getReviewedFilePath } from './file-review-fingerprint';
import type { ReviewedFiles } from './reviewed-files';

interface ReviewFileButtonProps {
  review: ReviewedFiles;
  change: GitLabMergeRequestChangeDC;
  head: string;
  base: string | null;
  onReviewedChange: (reviewed: boolean) => void;
}

export class ReviewFileButtonVM extends VM<ReviewFileButtonProps> {
  @observableRef private accessor fingerprint: string | null | undefined =
    undefined;
  private verification?: AbortController;

  @computed
  private get path() {
    return getReviewedFilePath(this.payload.change);
  }

  @computed
  private get saved() {
    return this.payload.review.files.get(this.path);
  }

  @computed
  get checked() {
    return (
      this.pending ??
      Boolean(this.saved && this.saved.fingerprint === this.fingerprint)
    );
  }

  @computed
  get verifying() {
    return Boolean(
      this.pending === undefined &&
        this.payload.head &&
        this.saved &&
        this.fingerprint === undefined,
    );
  }

  @computed
  private get pending() {
    const { review, head, base } = this.payload;
    return review.pendingStatus(this.path, head, base);
  }

  @computed
  get saving() {
    return this.pending !== undefined;
  }

  @computed
  get disabled() {
    const { head, review } = this.payload;
    return !head || !review.isReady || this.verifying;
  }

  willMount() {
    reaction(
      () => {
        const { review, change, head, base } = this.payload;
        return [review, change, head, base, Boolean(this.saved)] as const;
      },
      ([review, change, head, base, saved], previous) => {
        this.verification?.abort();
        if (
          !previous ||
          previous[0] !== review ||
          previous[1] !== change ||
          previous[2] !== head ||
          previous[3] !== base
        ) {
          this.fingerprint = undefined;
        }

        if (!head || !saved || this.fingerprint !== undefined) return;
        const controller = new AbortController();
        this.verification = controller;
        const complete = (value: string | null) => {
          if (!controller.signal.aborted) {
            runInAction(() => {
              this.fingerprint = value;
            });
          }
        };
        void review
          .fingerprint(change, head, base, controller.signal)
          .then(complete, () => complete(null));
      },
      {
        equals: compareShallow,
        fireImmediately: true,
        signal: this.unmountSignal,
      },
    );
    reaction(
      () => (this.verifying ? null : this.checked),
      (reviewed) => {
        if (reviewed !== null) this.payload.onReviewedChange(reviewed);
      },
      { fireImmediately: true, signal: this.unmountSignal },
    );
  }

  willUnmount() {
    this.verification?.abort();
  }

  @actionBound
  toggle() {
    const { review, change, head, base } = this.payload;
    review.setReviewed(
      change,
      head,
      base,
      !this.checked,
      this.fingerprint ?? undefined,
    );
  }
}
