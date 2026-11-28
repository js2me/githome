import { type CloudRequest, CloudRequestError } from '../forge/cloud-client';
import type { ForgePullRequestRef } from '../forge/contracts';
import { type Comment, mapComment } from './comment';
import { fetchBitbucketPage } from './page';
import { commentsPath } from './paths';

export const listGeneralComments = async (
  request: CloudRequest,
  ref: ForgePullRequestRef,
  cursor: string | undefined,
  signal: AbortSignal,
) => {
  const path = commentsPath(ref);
  const { values, next } = await fetchBitbucketPage<Comment>(
    request,
    cursor ?? `${path}?pagelen=30`,
    signal,
  );

  // Replies can omit inline metadata and their ancestors may be on other pages.
  const ancestors = new Map<number, Promise<Comment | null>>(
    values.map((value) => [value.id, Promise.resolve(value)]),
  );
  const getParent = (id: number) => {
    let parent = ancestors.get(id);
    if (!parent) {
      parent = request<Comment>(`${path}/${id}`, signal).then(
        ({ data }) => data,
        (error: unknown) => {
          if (error instanceof CloudRequestError && error.status === 404)
            return null;
          throw error;
        },
      );
      ancestors.set(id, parent);
    }
    return parent;
  };

  const isGeneral = async (value: Comment) => {
    const visited = new Set<number>();
    let current: Comment | null = value;
    while (current) {
      if (current.inline || visited.has(current.id)) return false;
      if (!current.parent) return true;
      visited.add(current.id);
      current = await getParent(current.parent.id);
    }
    return false;
  };

  const general = await Promise.all(
    values
      .filter((value) => !value.deleted)
      .map(async (value) =>
        (await isGeneral(value)) ? mapComment(value) : null,
      ),
  );
  return { items: general.filter((value) => value !== null), nextCursor: next };
};
