import { computed, reaction } from 'mobx';
import type { ReactNode } from 'react';
import { createRef } from 'yummies/mobx';
import type { GitLabJobDC, GitLabPipelineDC } from '@/shared/api/gitlab';
import { VM } from '@/shared/lib/view-models/vm';

interface PipelineDetailsDialogProps {
  pipelineId: number;
  pipeline?: GitLabPipelineDC;
  jobs: readonly GitLabJobDC[];
  loading: boolean;
  error?: string | null;
  description?: ReactNode;
  actions?: ReactNode;
  renderJobActions?: (job: GitLabJobDC) => ReactNode;
  renderJobDetails?: (job: GitLabJobDC) => ReactNode;
  onClose: () => void;
}

export class PipelineDetailsDialogVM extends VM<PipelineDetailsDialogProps> {
  readonly dialog = createRef<HTMLDialogElement>();
  readonly closeButton = createRef<HTMLButtonElement>();

  @computed
  get stages() {
    const stages = new Map<string, GitLabJobDC[]>();
    for (const job of [...this.payload.jobs].reverse()) {
      const stage = stages.get(job.stage);
      if (stage) stage.push(job);
      else stages.set(job.stage, [job]);
    }
    return stages;
  }

  willMount() {
    reaction(
      () => this.dialog.current,
      (dialog) => {
        if (!dialog) return;
        dialog.showModal();
        this.closeButton.current?.focus({ preventScroll: true });
        return () => {
          if (dialog.open) dialog.close();
        };
      },
      { fireImmediately: true, signal: this.unmountSignal },
    );
  }
}
