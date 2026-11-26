import type { GitLabConnection } from '@/shared/lib/gitlab/connection/connection';
import { LocalizedError } from '@/shared/lib/i18n/localized-error';
import { buildGitlabPath, gitlabFetch } from './client';

const perPage = 100;

const hasNextPage = (headers: Headers, page: number, count: number) => {
  const currentPage = headers.get('X-Page');
  if (currentPage && Number(currentPage) !== page)
    throw new LocalizedError('gitlab.gitlabReturnedADifferentPage');

  const nextPage = headers.get('X-Next-Page');
  const link = headers.get('Link');
  const nextLink = link?.match(/<([^>]+)>[^,]*;\s*rel="next"/i);
  if (nextPage || nextLink) {
    const fromLink =
      nextLink &&
      new URL(nextLink[1], 'https://gitlab.invalid').searchParams.get('page');
    if (
      (nextPage && Number(nextPage) !== page + 1) ||
      (nextLink && Number(fromLink) !== page + 1)
    ) {
      throw new LocalizedError('gitlab.gitlabReturnedAnInvalidNextPageNumber');
    }
    return true;
  }

  const totalPages = headers.get('X-Total-Pages');
  if (totalPages) {
    const total = Number(totalPages);
    if (!Number.isSafeInteger(total) || total < 0)
      throw new LocalizedError('gitlab.gitlabReturnedAnInvalidPageCount');
    return page < total;
  }

  // Some CORS/proxy configurations expose no pagination headers.
  return (
    nextPage === null &&
    !link &&
    count >= (Number(headers.get('X-Per-Page')) || perPage)
  );
};

export const fetchPaginatedItems = async <T extends { id: string | number }>(
  connection: GitLabConnection,
  path: string,
  query: Record<string, string | number | boolean>,
  signal?: AbortSignal,
): Promise<T[]> => {
  const items = new Map<T['id'], T>();

  for (let page = 1; ; page++) {
    signal?.throwIfAborted();
    const response = await gitlabFetch(
      connection,
      buildGitlabPath(path, { ...query, per_page: perPage, page }),
      signal,
    );
    const batch: T[] = await response.json();
    signal?.throwIfAborted();
    if (!Array.isArray(batch))
      throw new LocalizedError('gitlab.gitlabReturnedAnInvalidList');

    const previousSize = items.size;
    for (const item of batch) {
      if (!item?.id)
        throw new LocalizedError('gitlab.missingIdInTheGitlabResponse');
      items.set(item.id, item);
    }
    if (page > 1 && batch.length && items.size === previousSize) {
      throw new LocalizedError('gitlab.gitlabReturnedADuplicatePage');
    }
    if (!hasNextPage(response.headers, page, batch.length))
      return [...items.values()];
    if (!batch.length)
      throw new LocalizedError('gitlab.gitlabReturnedAnEmptyIntermediatePage');
  }
};
