import {
  actionBound,
  compareShallow,
  computed,
  observable,
  reaction,
} from 'mobx';
import { queryClient } from 'mobx-tanstack-query/preset';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { createRef } from 'yummies/mobx';
import { resolveGitlabRequestUrl } from '@/shared/api/gitlab';
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
        const path = resolveGitlabRequestUrl(
          connection.gitlabUrl,
          `/api/v4/projects/${projectId}/merge_requests`,
        );
        void queryClient.invalidateQueries({ queryKey: path.split('/') });
      }
      await page.mrInfo.refreshMetadata();
    },
  });
  readonly fileNavigation = new ActiveDiffFile();
  readonly activityButton = createRef<HTMLButtonElement>();
  readonly changesHeading = createRef<HTMLHeadingElement>();
  readonly merge = new MrMerge(this.parentViewModel.mrInfo, this.unmountSignal);
  readonly closeMrDialog = createRef<HTMLDialogElement>();
  @observable accessor activityExpanded = false;
  @observable accessor descriptionExpanded = false;
  @observable accessor width = CHANGES_FILE_TREE_DEFAULT_WIDTH;
  private finishResize?: () => void;

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
      () => [info.mergeRequestChanges, info.gitDiff.revision] as const,
      ([changes]) => this.fileNavigation.track(changes ?? []),
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
  private resize(width: number) {
    this.width = clampChangesFileTreeWidth(width);
  }

  @actionBound
  toggleActivity() {
    this.activityExpanded = !this.activityExpanded;
  }

  @actionBound
  toggleDescription() {
    this.descriptionExpanded = !this.descriptionExpanded;
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

  @actionBound
  showComments() {
    this.activityExpanded = true;
    this.activityButton.current?.focus({ preventScroll: true });
    this.activityButton.current?.scrollIntoView({ block: 'start' });
  }

  @actionBound
  showFiles() {
    this.changesHeading.current?.focus({ preventScroll: true });
    this.changesHeading.current?.scrollIntoView({ block: 'start' });
  }
}
