import { ArrowUpRightFromSquare, ChevronRight } from '@gravity-ui/icons';
import {
  PipelineStatus,
  pipelineStatusLabel,
} from '@/entities/gitlab-pipelines';
import { t } from '@/shared/lib/i18n';

export const PipelineCard = ({
  id,
  label,
  status,
  href,
  onOpen,
}: {
  id: number;
  label: string;
  status: string;
  href?: string;
  onOpen: () => void;
}) => (
  <section
    className="min-w-0 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-control)]"
    aria-label={label}
  >
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 px-2.5 py-0.5">
      <span className="min-w-0 font-semibold text-fg-default text-xs">
        {label}
      </span>
      {href ? (
        <a
          className="inline-flex shrink-0 items-center gap-1 rounded-sm py-1 font-mono text-fg-link text-xs hover:underline"
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label={t('pipelines.openPipelineInGitlab', { v1: id })}
        >
          #{id}
          <ArrowUpRightFromSquare className="size-3" aria-hidden />
        </a>
      ) : (
        <span className="shrink-0 font-mono text-fg-muted text-xs">#{id}</span>
      )}
      <button
        className="flex min-h-9 min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 rounded-md px-1.5 text-left hover:bg-[var(--glass-hover)]"
        type="button"
        aria-haspopup="dialog"
        aria-label={t('pipelines.openPipelineDetails', {
          v1: id,
          v2: pipelineStatusLabel(status),
        })}
        onClick={onOpen}
      >
        <PipelineStatus status={status} />
        <ChevronRight className="size-3.5 shrink-0 text-fg-muted" aria-hidden />
      </button>
    </div>
  </section>
);

export { PipelineDetailsDialog } from './pipeline-details-dialog';
export { PipelineRunDialog } from './pipeline-run-dialog';
