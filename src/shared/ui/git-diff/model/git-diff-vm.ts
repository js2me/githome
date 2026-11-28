import {
  compareShallow,
  type IObservableValue,
  observableRef,
  reaction,
  runInAction,
} from 'mobx';
import type { ReactNode } from 'react';
import { createRef } from 'yummies/mobx';
import type {
  GitLabDiscussionDC,
  GitLabMergeRequestChangeDC,
} from '@/shared/api/gitlab';
import {
  getDiffFileElementId,
  getDiffFileKey,
} from '@/shared/lib/diff/diff-search';
import type { CreateDiffCommentInput } from '@/shared/lib/gitlab/discussions/diff-comment';
import type { DiffFileContentLoader } from '@/shared/lib/syntax-highlight/types';
import { VM } from '@/shared/lib/view-models/vm';
import type { GitlabMarkdownScope } from '@/shared/ui/gitlab-markdown/model';
import { trackAutoReviewScroll } from './auto-review-scroll';
import type { DiffSearchVM } from './diff-search';
import { FileGitDiff } from './file-git-diff';
import type { FileGitDiffContent } from './file-git-diff/content/content';
import type { DiffImageLoader } from './file-git-diff/content/images';

const MAX_CONCURRENT_COLLAPSED_EXPANDS = 2;

export type OnReviewedChange = (reviewed: boolean, byUser?: boolean) => void;

export interface GitDiffProps {
  changes: GitLabMergeRequestChangeDC[];
  discussions: GitLabDiscussionDC[];
  canComment: boolean;
  isSubmittingComment: boolean;
  submitCommentError: string | null;
  onAddComment: (input: CreateDiffCommentInput) => Promise<boolean>;
  onClearSubmitError: () => void;
  renderFileAction?: (
    change: GitLabMergeRequestChangeDC,
    onReviewedChange: OnReviewedChange,
  ) => ReactNode;
  onAutoReviewFile?: (
    change: GitLabMergeRequestChangeDC,
    article: HTMLElement,
  ) => boolean;
  mergeRequestIid?: number;
  headBranch?: string | null;
  headRef?: string | null;
  baseRef?: string | null;
  loadFileContent?: DiffFileContentLoader;
  loadFileImage?: DiffImageLoader;
  onResolveThread?: (discussionId: string, resolved: boolean) => void;
  resolvingDiscussionId?: string | null;
  onReplyThread?: (discussionId: string, body: string) => Promise<boolean>;
  replyingDiscussionId?: string | null;
  replyErrorDiscussionId?: string | null;
  replyError?: string | null;
  onClearReplyError?: () => void;
  currentUserId?: number | null;
  onUpdateDiscussionNote?: (
    discussionId: string,
    noteId: number,
    body: string,
  ) => Promise<boolean>;
  onDeleteDiscussionNote?: (
    discussionId: string,
    noteId: number,
  ) => Promise<boolean>;
  updatingNoteKey?: string | null;
  deletingNoteKey?: string | null;
  updateNoteError?: string | null;
  deleteNoteErrorKey?: string | null;
  deleteNoteError?: string | null;
  onClearUpdateNoteError?: () => void;
  onClearDeleteNoteError?: () => void;
  activeFile?: IObservableValue<string | null>;
  onActiveFileChange?: (fileKey: string) => void;
  markdownScope?: GitlabMarkdownScope;
}

interface GitDiffPayload extends GitDiffProps {
  searchRegistration: DiffSearchVM | null;
}

export class GitDiffVM extends VM<GitDiffPayload> {
  private readonly fileModelCache = new Map<string, FileGitDiff>();
  private readonly pendingCollapsedExpands = new Set<FileGitDiffContent>();
  private activeCollapsedExpands = 0;

  @observableRef accessor reviewedStackAnchor: string | null = null;
  private reviewedStackFrame = 0;
  private stopAutoReview?: () => void;
  readonly listRef = createRef<HTMLDivElement>({
    onChange: (list) => this.syncAutoReview(list),
  });

  private syncAutoReview(list: HTMLDivElement | null) {
    this.stopAutoReview?.();
    this.stopAutoReview =
      list && this.payload.onAutoReviewFile
        ? trackAutoReviewScroll(list, this.autoReviewFile)
        : undefined;
  }

  autoReviewFile = (article: HTMLElement) =>
    runInAction(() => {
      const file = this.filesGitDiffs.find(
        ({ fileKey }) => getDiffFileElementId(fileKey) === article.id,
      );
      if (
        !file ||
        file.content.isReviewed ||
        !this.payload.onAutoReviewFile?.(file.meta.change, article)
      ) {
        return false;
      }
      file.content.setReviewed(true, 'auto');
      return true;
    });

  placeReviewedStack(fileKey: string, preserveNextFile = false) {
    this.reviewedStackAnchor = fileKey;
    const file = document.getElementById(getDiffFileElementId(fileKey));
    let next = preserveNextFile ? file?.nextElementSibling : null;
    while (next && !next.matches('article:not([data-diff-reviewed])')) {
      next = next.nextElementSibling;
    }
    const nextTop = next?.getBoundingClientRect().top;
    const rect = file?.querySelector('header')?.getBoundingClientRect();
    const top =
      rect && rect.bottom > 0 && rect.top < window.innerHeight
        ? Math.max(0, rect.top)
        : null;
    const transferFocus = file?.contains(document.activeElement);
    const previousStack =
      file?.parentElement?.querySelector<HTMLDetailsElement>(
        ':scope > [data-diff-reviewed-stack]',
      );
    if (previousStack?.open) previousStack.open = false;

    cancelAnimationFrame(this.reviewedStackFrame);
    // Wait until the stack replaces the clicked card in the DOM.
    this.reviewedStackFrame = requestAnimationFrame(() => {
      if (!file?.hasAttribute('data-diff-reviewed')) return;
      const stack = file.parentElement?.querySelector<HTMLDetailsElement>(
        ':scope > [data-diff-reviewed-stack]',
      );
      const summary = stack?.querySelector('summary');
      // The user can reopen an existing stack before the next frame.
      if (!stack || !summary || stack.open) return;
      const offset =
        next?.isConnected && nextTop !== undefined
          ? next.getBoundingClientRect().top - nextTop
          : top === null
            ? 0
            : summary.getBoundingClientRect().top - top;
      if (offset) {
        window.scrollBy({
          top: offset,
          behavior: 'instant',
        });
      }
      if (transferFocus) summary.focus({ preventScroll: true });
    });
  }

  scheduleCollapsedExpand(content: FileGitDiffContent) {
    if (
      content.parsed ||
      content.isLoadingCollapsedExpand ||
      this.pendingCollapsedExpands.has(content)
    ) {
      return;
    }

    this.pendingCollapsedExpands.add(content);
    this.runCollapsedExpandQueue();
  }

  cancelCollapsedExpand(content: FileGitDiffContent) {
    this.pendingCollapsedExpands.delete(content);
  }

  private runCollapsedExpandQueue() {
    while (
      this.activeCollapsedExpands < MAX_CONCURRENT_COLLAPSED_EXPANDS &&
      this.pendingCollapsedExpands.size > 0
    ) {
      const content = this.pendingCollapsedExpands.values().next().value!;
      this.pendingCollapsedExpands.delete(content);
      this.activeCollapsedExpands += 1;

      void content
        .expandCollapsedFile()
        .catch(() => undefined)
        .finally(() => {
          this.activeCollapsedExpands -= 1;
          this.runCollapsedExpandQueue();
        });
    }
  }

  @observableRef accessor filesGitDiffs: FileGitDiff[] = [];

  willMount() {
    reaction(
      () => Boolean(this.payload.onAutoReviewFile),
      () => this.syncAutoReview(this.listRef.current),
      { signal: this.unmountSignal },
    );
    reaction(
      () => this.payload.changes.slice(),
      (changes) => this.syncFiles(changes),
      {
        equals: compareShallow,
        fireImmediately: true,
        signal: this.unmountSignal,
      },
    );
  }

  private syncFiles(changes: GitLabMergeRequestChangeDC[]) {
    const activeKeys = new Set<string>();

    const models = changes.map((change) => {
      const key = getDiffFileKey(change.old_path, change.new_path);
      activeKeys.add(key);

      let model = this.fileModelCache.get(key);
      if (!model) {
        model = new FileGitDiff(this, change);
        this.fileModelCache.set(key, model);
      } else {
        model.syncChange(change);
      }

      return model;
    });

    for (const [key, model] of this.fileModelCache) {
      if (!activeKeys.has(key)) {
        model.dispose();
        this.fileModelCache.delete(key);
      }
    }

    this.filesGitDiffs = models;
  }

  willUnmount() {
    this.stopAutoReview?.();
    cancelAnimationFrame(this.reviewedStackFrame);
    for (const model of this.fileModelCache.values()) {
      model.dispose();
    }
    this.fileModelCache.clear();
  }
}
