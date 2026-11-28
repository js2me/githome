import {
  actionBound,
  compareShallow,
  computed,
  observable,
  reaction,
} from 'mobx';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { createRef } from 'yummies/mobx';
import { invalidateProjectMergeRequests } from '@/shared/api/gitlab/queries/merge-requests/cache';
import { getDiffFileKey } from '@/shared/lib/diff/diff-search';
import {
  CHANGES_FILE_TREE_DEFAULT_WIDTH,
  clampChangesFileTreeWidth,
  estimateChangesFileTreeWidth,
} from '@/shared/lib/file-tree/changes-file-tree-width';
import { filterDiscussionsForActivity } from '@/shared/lib/gitlab/discussions/diff-discussions';
import { parseMergeRequestLocation } from '@/shared/lib/gitlab/links/merge-request';
import { matchGitlabProject } from '@/shared/lib/gitlab/links/project';
import { VM } from '@/shared/lib/view-models/vm';
import { ActiveDiffFile } from './changes/active-diff-file';
import { MrCommits } from './changes/mr-commits';
import type { MergeRequestPageVM } from './index';
import { MrMerge } from './merge/mr-merge';
import { MrMetadataEditor } from './metadata/editor';
import { MergeRequestPipelines } from './pipelines/merge-request-pipelines';

export class MergeRequestDetailVM extends VM<EmptyObject, MergeRequestPageVM> {
  readonly pipelines = new MergeRequestPipelines({
    globals: this.globals,
    abortSignal: this.unmountSignal,
    target: () => {
      const projectId = this.markdownScope.projectId;
      const mr = this.parentViewModel.mrInfo.mergeRequestDetail;
      return projectId > 0 && mr ? { projectId, mr } : null;
    },
  });
  readonly metadata = new MrMetadataEditor({
    globals: this.globals,
    abortSignal: this.unmountSignal,
    target: () => {
      const { projectId, projectPath } = this.markdownScope;
      const mr = this.parentViewModel.mrInfo.mergeRequestDetail;
      return projectId > 0 && projectPath && mr
        ? { projectId, projectPath, mr }
        : null;
    },
    refresh: async () => {
      const page = this.parentViewModel;
      const { projectId, connection } = this.markdownScope;
      if (connection && projectId > 0) {
        void invalidateProjectMergeRequests(connection, projectId);
      }
      await page.mrInfo.refreshMetadata();
    },
  });
  readonly fileNavigation = new ActiveDiffFile();
  readonly commits = new MrCommits(
    this.parentViewModel.globals,
    this.unmountSignal,
    () => ({
      projectId: this.parentViewModel.projectId,
      iid: this.parentViewModel.mergeRequestIid,
    }),
  );
  readonly merge = new MrMerge(this.parentViewModel.mrInfo, this.unmountSignal);
  readonly closeMrDialog = createRef<HTMLDialogElement>();
  @observable accessor overviewPanel: 'description' | 'discussion' | 'commits' =
    'description';
  @observable accessor width = CHANGES_FILE_TREE_DEFAULT_WIDTH;
  @observable accessor zen = false;
  @observable accessor editorCommits = false;
  @observable accessor mobileFilesOpen = false;
  @observable accessor autoReviewFiles = false;
  private finishResize?: () => void;
  private scrollFrame = 0;

  @computed
  get editorOpen() {
    return this.parentViewModel.globals.query.data.view === 'changes';
  }

  @computed
  get showEditorCommits() {
    return this.editorCommits || Boolean(this.commits.selectedId);
  }

  @actionBound
  toggleZen() {
    this.zen = !this.zen;
  }

  @actionBound
  toggleAutoReviewFiles() {
    this.autoReviewFiles = !this.autoReviewFiles;
  }

  @actionBound
  toggleMobileFiles() {
    this.mobileFilesOpen = !this.mobileFilesOpen;
  }

  @actionBound
  selectEditorFile(fileKey: string) {
    if (!this.mobileFilesOpen) {
      this.fileNavigation.jumpToFile(fileKey);
      return;
    }
    this.mobileFilesOpen = false;
    this.scheduleScroll(fileKey);
  }

  @actionBound
  selectEditorCommit(commit: string) {
    this.mobileFilesOpen = false;
    this.openEditor(undefined, commit);
  }

  @actionBound
  showFilesTab() {
    this.editorCommits = false;
    if (this.commits.selectedId) this.openEditor();
  }

  @actionBound
  showCommitsTab() {
    this.editorCommits = true;
    this.commits.load();
  }

  private scheduleScroll(fileKey?: string) {
    cancelAnimationFrame(this.scrollFrame);
    this.scrollFrame = requestAnimationFrame(() => {
      if (fileKey) this.fileNavigation.jumpToFile(fileKey);
      else window.scrollTo(0, 0);
    });
  }

  @actionBound
  setOverviewPanel(panel: MergeRequestDetailVM['overviewPanel']) {
    this.overviewPanel = panel;
    if (panel === 'commits') this.commits.load();
  }

  @actionBound
  openEditor(file?: string, commit?: string) {
    this.parentViewModel.globals.query.update(
      {
        view: 'changes',
        file: file || null,
        commit: commit || null,
      },
      false,
    );
  }

  @actionBound
  showOverview() {
    this.parentViewModel.globals.query.update(
      {
        view: null,
        file: null,
        commit: null,
      },
      false,
    );
  }

  @computed
  get noteActions() {
    const info = this.parentViewModel.mrInfo;
    return {
      currentUserId: info.currentUserId,
      onUpdateDiscussionNote: info.updateDiscussionNote,
      onDeleteDiscussionNote: info.deleteDiscussionNote,
      updatingNoteKey: info.updatingNoteKey || null,
      deletingNoteKey: info.deletingNoteKey || null,
      updateNoteError: info.updateNoteError || null,
      deleteNoteErrorKey: info.deleteNoteErrorKey || null,
      deleteNoteError: info.deleteNoteError || null,
      onClearUpdateNoteError: info.clearUpdateNoteError,
      onClearDeleteNoteError: info.clearDeleteNoteError,
    };
  }

  @computed
  get activityDiscussions() {
    return filterDiscussionsForActivity(
      this.parentViewModel.mrInfo.detailView?.discussions ?? [],
    );
  }

  @computed
  get markdownScope() {
    const page = this.parentViewModel;
    const project = page.project;
    const connection = this.globals.stores.settings.activeConnection;
    const mrUrl = page.mrInfo.mergeRequestDetail?.web_url;
    const mrLocation =
      !project && mrUrl ? parseMergeRequestLocation(mrUrl) : undefined;
    const mrProject =
      connection && mrLocation
        ? matchGitlabProject(mrLocation, connection.gitlabUrl)
        : undefined;
    return {
      projectId: project?.id ?? page.projectId ?? 0,
      projectPath: project?.path_with_namespace ?? mrProject?.projectPath ?? '',
      connection,
    };
  }

  willMount() {
    const info = this.parentViewModel.mrInfo;
    reaction(
      () => {
        const { file } = this.parentViewModel.globals.query.data;
        const detail = info.detailView;
        const ready = Boolean(
          detail &&
            !detail.isPreparingDiffs &&
            !this.parentViewModel.parentViewModel.isLoading,
        );
        return [this.editorOpen, this.commits.selectedId, file, ready] as const;
      },
      ([editor, commit, path, ready]) => {
        if (!editor || commit || !path) {
          this.scheduleScroll();
        } else if (ready) {
          const change = info.detailView?.changes.find(
            (item) =>
              (item.deleted_file ? item.old_path : item.new_path) === path,
          );
          this.scheduleScroll(
            change && getDiffFileKey(change.old_path, change.new_path),
          );
        }
      },
      {
        fireImmediately: true,
        equals: compareShallow,
        signal: this.unmountSignal,
      },
    );
    reaction(
      () =>
        [
          this.editorOpen,
          this.commits.selectedId,
          info.mergeRequestChanges,
          info.gitDiff.revision,
        ] as const,
      ([, commit, changes]) =>
        this.fileNavigation.track(commit ? [] : (changes ?? [])),
      {
        fireImmediately: true,
        signal: this.unmountSignal,
        equals: compareShallow,
      },
    );
    reaction(
      () =>
        info.mergeRequestChanges?.map(
          (change) => `${change.old_path}\0${change.new_path}`,
        ),
      () => {
        this.width = estimateChangesFileTreeWidth(
          info.mergeRequestChanges ?? [],
        );
      },
      {
        fireImmediately: true,
        signal: this.unmountSignal,
        equals: compareShallow,
      },
    );
    window.addEventListener('resize', this.clampWidth, {
      passive: true,
      signal: this.unmountSignal,
    });
  }

  didUnmount() {
    cancelAnimationFrame(this.scrollFrame);
    this.fileNavigation.dispose();
    this.finishResize?.();
  }

  @actionBound
  private clampWidth() {
    this.width = clampChangesFileTreeWidth(this.width);
  }

  @actionBound
  handleResizePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    this.finishResize?.();
    const startX = event.clientX;
    const startWidth = this.width;
    const previousCursor = document.body.style.cursor;
    const previousSelect = document.body.style.userSelect;
    const controller = new AbortController();
    const finish = () => {
      controller.abort();
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousSelect;
      this.finishResize = undefined;
    };
    this.finishResize = finish;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener(
      'pointermove',
      (move) => this.resize(startWidth + move.clientX - startX),
      { signal: controller.signal },
    );
    document.addEventListener('pointerup', finish, {
      signal: controller.signal,
    });
    document.addEventListener('pointercancel', finish, {
      signal: controller.signal,
    });
  }

  @actionBound
  resize(width: number) {
    this.width = clampChangesFileTreeWidth(width);
  }

  @actionBound
  showCloseMrDialog() {
    this.closeMrDialog.current?.showModal();
  }

  @actionBound
  dismissCloseMrDialog() {
    this.closeMrDialog.current?.close();
  }

  @actionBound
  confirmCloseMr() {
    this.dismissCloseMrDialog();
    void this.parentViewModel.mrInfo.close();
  }
}
