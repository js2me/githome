import type {
  GitLabMergeRequestDC,
  GitLabPipelineSummaryDC,
} from '@/shared/api/gitlab';

export const mergeRequestHeadSha = (mr: GitLabMergeRequestDC) =>
  mr.diff_refs?.head_sha || mr.sha;

type HeadPipeline = NonNullable<GitLabMergeRequestDC['head_pipeline']>;
type Pipeline = GitLabPipelineSummaryDC | HeadPipeline;
type Kind = 'mr' | 'branch' | 'unknown';

interface SelectedPipeline {
  kind: Kind;
  pipeline: Pipeline;
  projectId: number;
}

export const selectPipelines = (
  mr: GitLabMergeRequestDC,
  targetProjectId: number,
  mrRuns: readonly GitLabPipelineSummaryDC[],
  branchRuns: readonly GitLabPipelineSummaryDC[],
): SelectedPipeline[] => {
  const head = mr.head_pipeline;
  const sha = mergeRequestHeadSha(mr);
  const sourceProjectId =
    mr.source_project_id === undefined ? targetProjectId : mr.source_project_id;
  const mrRef = `refs/merge-requests/${mr.iid}/`;
  const isMr = (pipeline: Pipeline) =>
    pipeline.source === 'merge_request_event' ||
    (!pipeline.source && pipeline.ref?.startsWith(mrRef));
  const isBranch = (pipeline: Pipeline) =>
    sourceProjectId !== null &&
    pipeline.ref === mr.source_branch &&
    (!pipeline.project_id || pipeline.project_id === sourceProjectId) &&
    !isMr(pipeline) &&
    pipeline.source !== 'parent_pipeline';

  const candidates: readonly Pipeline[] = head ? [...mrRuns, head] : mrRuns;
  const latest = (
    runs: readonly Pipeline[],
    predicate: (run: Pipeline) => unknown,
  ) =>
    runs.reduce<Pipeline | undefined>(
      (selected, run) =>
        predicate(run) && (!selected || run.id > selected.id) ? run : selected,
      undefined,
    );

  const mrRun = latest(candidates, (run) => {
    if (!isMr(run)) return false;
    if (sha && run.sha === sha) return true;
    // A merged-results/merge-train run has a synthetic SHA. Only trust it
    // when GitLab points to that run as the MR's head_pipeline.
    return (
      run.id === head?.id &&
      (!sha ||
        !run.sha ||
        run.ref === `${mrRef}merge` ||
        run.ref === `${mrRef}train`)
    );
  });
  const branchRun = latest(
    [...branchRuns, ...candidates],
    (run) =>
      isBranch(run) &&
      (sha
        ? run.sha === sha || (run.id === head?.id && !run.sha)
        : run.id === head?.id),
  );

  const selected: SelectedPipeline[] = [];
  if (mrRun)
    selected.push({
      kind: 'mr',
      pipeline: mrRun,
      projectId: mrRun.project_id ?? targetProjectId,
    });
  if (branchRun && sourceProjectId !== null && branchRun.id !== mrRun?.id) {
    selected.push({
      kind: 'branch',
      pipeline: branchRun,
      projectId: sourceProjectId,
    });
  }
  if (
    !selected.length &&
    head &&
    !head.ref &&
    !head.source &&
    (!sha || !head.sha || sha === head.sha)
  ) {
    selected.push({
      kind: 'unknown',
      pipeline: head,
      projectId: head.project_id ?? targetProjectId,
    });
  }
  return selected;
};
