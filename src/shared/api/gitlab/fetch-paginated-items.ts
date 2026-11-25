import type { GitLabConnection } from '@/shared/lib/gitlab/connection';
import { buildGitlabPath, gitlabFetch } from './client';

const perPage = 100;

const hasNextPage = (headers: Headers, page: number, count: number) => {
  const currentPage = headers.get('X-Page');
  if (currentPage && Number(currentPage) !== page)
    throw new Error('GitLab вернул другую страницу');

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
      throw new Error('GitLab вернул некорректный номер следующей страницы');
    }
    return true;
  }

  const totalPages = headers.get('X-Total-Pages');
  if (totalPages) {
    const total = Number(totalPages);
    if (!Number.isSafeInteger(total) || total < 0)
      throw new Error('GitLab вернул некорректное число страниц');
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
      throw new Error('GitLab вернул некорректный список');

    const previousSize = items.size;
    for (const item of batch) {
      if (!item?.id) throw new Error('В ответе GitLab отсутствует ID');
      items.set(item.id, item);
    }
    if (page > 1 && batch.length && items.size === previousSize) {
      throw new Error('GitLab вернул повторную страницу');
    }
    if (!hasNextPage(response.headers, page, batch.length))
      return [...items.values()];
    if (!batch.length)
      throw new Error('GitLab вернул пустую промежуточную страницу');
  }
};
