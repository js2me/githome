import type { GitLabConnection } from "@/shared/lib/gitlab/connection";
import { isDiscussionResolvable, isDiscussionResolved } from "@/shared/lib/gitlab/diff-discussions";
import { GitLabApiError, GitLabGraphqlError, gitlabGraphql } from "../client";
import type { GitLabMergeRequestDiscussionSummary, GitLabProjectDC } from "../data-contracts";
import { getMergeRequestDiscussions } from "./get-merge-request-discussions";

type SummariesByIid = Partial<Record<number, GitLabMergeRequestDiscussionSummary>>;

interface CountNode {
  iid: string;
  resolvableDiscussionsCount: number | null;
  resolvedDiscussionsCount: number | null;
}

interface CountsResponse {
  project: {
    mergeRequests: {
      nodes: (CountNode | null)[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    } | null;
  } | null;
}

const countsQuery = `
  query MergeRequestDiscussionSummaries($projectPath: ID!, $iids: [String!]!, $first: Int!, $after: String) {
    project(fullPath: $projectPath) {
      mergeRequests(iids: $iids, first: $first, after: $after) {
        nodes { iid resolvableDiscussionsCount resolvedDiscussionsCount }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;

const unsupportedConnections = new WeakSet<GitLabConnection>();
const countFields = new Set(["resolvableDiscussionsCount", "resolvedDiscussionsCount"]);
const missingFieldMessage = /^(?:Field ['"](\w+)['"] doesn't exist on type|Cannot query field ['"](\w+)['"] on type) ['"]MergeRequest['"]/;

const countsUnsupported = (error: unknown) =>
  error instanceof GitLabGraphqlError && error.errors.every(({ extensions, message }) => {
    if (extensions?.code === "undefinedField" && extensions.fieldName) {
      return extensions.typeName === "MergeRequest" && countFields.has(extensions.fieldName);
    }
    const match = missingFieldMessage.exec(message);
    return Boolean(match && countFields.has(match[1] || match[2]));
  });

const loadCountPage = async (
  connection: GitLabConnection,
  projectPath: string,
  iids: number[],
  summaries: SummariesByIid,
  signal?: AbortSignal,
) => {
  const ids = iids.map(String);
  const cursors = new Set<string>();
  let after: string | null = null;

  while (true) {
    signal?.throwIfAborted();
    const data: CountsResponse = await gitlabGraphql<CountsResponse>(
      connection, countsQuery, { projectPath, iids: ids, first: ids.length, after }, signal,
    );
    const page = data.project?.mergeRequests;
    for (const node of page?.nodes ?? []) {
      if (!node || !ids.includes(node.iid)) continue;
      const total = node.resolvableDiscussionsCount;
      const resolved = node.resolvedDiscussionsCount;
      if (total != null && resolved != null && Number.isSafeInteger(total) &&
          Number.isSafeInteger(resolved) && resolved >= 0 && resolved <= total) {
        summaries[Number(node.iid)] = { total, resolved };
      }
    }
    if (!page?.pageInfo?.hasNextPage) return;
    const cursor = page.pageInfo.endCursor;
    if (!cursor || cursors.has(cursor)) throw new Error("GitLab вернул некорректную страницу merge requests");
    cursors.add(cursor);
    after = cursor;
  }
};

const loadRestSummary = async (
  connection: GitLabConnection,
  project: Pick<GitLabProjectDC, "id">,
  iid: number,
  signal?: AbortSignal,
): Promise<GitLabMergeRequestDiscussionSummary | undefined> => {
  try {
    const discussions = await getMergeRequestDiscussions(connection, project, iid, signal);
    let total = 0;
    let resolved = 0;
    for (const discussion of discussions) {
      if (discussion.notes.some(note =>
        typeof note.resolvable !== "boolean" || (note.resolvable && typeof note.resolved !== "boolean"),
      )) return undefined;
      if (!isDiscussionResolvable(discussion)) continue;
      total++;
      if (isDiscussionResolved(discussion)) resolved++;
    }
    return { total, resolved };
  } catch (error) {
    if (error instanceof GitLabApiError && (error.status === 403 || error.status === 404)) return undefined;
    throw error;
  }
};

export const getMergeRequestDiscussionSummaries = async (
  connection: GitLabConnection,
  project: Pick<GitLabProjectDC, "id"> & { path_with_namespace?: string },
  mergeRequestIids: readonly number[],
  signal?: AbortSignal,
): Promise<SummariesByIid> => {
  signal?.throwIfAborted();
  const summaries: SummariesByIid = {};
  const iids = [...new Set(mergeRequestIids)];
  if (project.path_with_namespace && !unsupportedConnections.has(connection)) {
    try {
      for (let i = 0; i < iids.length; i += 100) {
        await loadCountPage(connection, project.path_with_namespace, iids.slice(i, i + 100), summaries, signal);
      }
      signal?.throwIfAborted();
      return summaries;
    } catch (error) {
      if (!countsUnsupported(error)) throw error;
      unsupportedConnections.add(connection);
    }
  }

  // REST also works by numeric ID when an inbox entry has no project path.
  const missing = iids.filter(iid => !summaries[iid]);
  for (let i = 0; i < missing.length; i += 3) {
    signal?.throwIfAborted();
    await Promise.all(missing.slice(i, i + 3).map(async iid => {
      const summary = await loadRestSummary(connection, project, iid, signal);
      if (summary) summaries[iid] = summary;
    }));
  }
  signal?.throwIfAborted();
  return summaries;
};
