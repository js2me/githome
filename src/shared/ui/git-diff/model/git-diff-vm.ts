import { computed } from "mobx";
import { GitLabDiscussionDC, GitLabMergeRequestChangeDC } from "@/shared/api/gitlab";
import { CreateDiffCommentInput } from "@/shared/lib/gitlab/diff-comment";
import { getDiffFileKey } from "@/shared/lib/diff-search";
import { DiffFileContentLoader } from "@/shared/lib/syntax-highlight/types";
import type { GitlabMarkdownScope } from "@/shared/ui/gitlab-markdown/model";
import type { ViewModelParams } from "mobx-view-model";
import type { Globals } from "@/globals";
import { VM } from "@/shared/lib/view-models/vm";
import { FileGitDiff } from "./file-git-diff";
import type { FileGitDiffContent } from "./file-git-diff/content";

const MAX_CONCURRENT_COLLAPSED_EXPANDS = 2;

export interface GitDiffPayload {
  changes: GitLabMergeRequestChangeDC[];
  discussions: GitLabDiscussionDC[];
  canComment: boolean;
  isSubmittingComment: boolean;
  submitCommentError: string | null;
  onAddComment: (input: CreateDiffCommentInput) => Promise<boolean>;
  onClearSubmitError: () => void;
  headBranch?: string | null;
  headRef?: string | null;
  baseRef?: string | null;
  loadFileContent?: DiffFileContentLoader;
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
  activeFileKey?: string | null;
  onActiveFileChange?: (fileKey: string) => void;
  markdownScope?: GitlabMarkdownScope;
}

export class GitDiffVM extends VM<GitDiffPayload> {
  private readonly fileModelCache = new Map<string, FileGitDiff>();
  private readonly pendingCollapsedExpands = new Set<FileGitDiffContent>();
  private activeCollapsedExpands = 0;

  constructor(globals: Globals, params: ViewModelParams<GitDiffPayload>) {
    super(globals, params);
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

  @computed
  get filesGitDiffs(): FileGitDiff[] {
    const activeKeys = new Set<string>();

    const models = this.payload.changes.map((change) => {
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

    return models;
  }

  willUnmount() {
    for (const model of this.fileModelCache.values()) {
      model.dispose();
    }
    this.fileModelCache.clear();
  }
}
