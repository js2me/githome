import { computed } from "mobx";
import { GitLabDiscussionDC, GitLabMergeRequestChangeDC } from "@/shared/api/gitlab";
import { CreateDiffCommentInput } from "@/shared/lib/gitlab/diff-comment";
import { getDiffFileKey } from "@/shared/lib/diff-search";
import { DiffFileContentLoader } from "@/shared/lib/syntax-highlight/types";
import type { GitlabMarkdownScope } from "@/shared/ui/gitlab-markdown/model";
import { ViewModelBase } from "mobx-view-model";
import { FileGitDiff } from "./file-git-diff";

export interface GitDiffPayload {
  changes: GitLabMergeRequestChangeDC[];
  discussions: GitLabDiscussionDC[];
  canComment: boolean;
  isSubmittingComment: boolean;
  submitCommentError: string | null;
  onAddComment: (input: CreateDiffCommentInput) => Promise<boolean>;
  onClearSubmitError: () => void;
  headRef?: string | null;
  baseRef?: string | null;
  loadFileContent?: DiffFileContentLoader;
  onResolveThread?: (discussionId: string, resolved: boolean) => void;
  resolvingDiscussionId?: string | null;
  currentUserId?: number | null;
  onUpdateDiscussionNote?: (
    discussionId: string,
    noteId: number,
    body: string,
  ) => Promise<boolean>;
  updatingNoteKey?: string | null;
  updateNoteError?: string | null;
  onClearUpdateNoteError?: () => void;
  activeFileKey?: string | null;
  onActiveFileChange?: (fileKey: string) => void;
  markdownScope?: GitlabMarkdownScope;
}

export class GitDiffVM extends ViewModelBase<GitDiffPayload> {
  private readonly fileModelCache = new Map<string, FileGitDiff>();

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
