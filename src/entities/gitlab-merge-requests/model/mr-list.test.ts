import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Globals } from "@/globals";
import type { GitLabMergeRequestDC } from "@/shared/api/gitlab";
import { createGitlabApiQuery, createInfiniteGitlabQuery } from "@/shared/lib/gitlab/create-query";
import { MrList } from "./mr-list";

vi.mock("@/shared/lib/gitlab/create-query", () => ({
  createGitlabApiQuery: vi.fn(),
  createInfiniteGitlabQuery: vi.fn(),
}));

const makePage = (start: number, count: number, hasNextPage: boolean) => ({
  items: Array.from({ length: count }, (_, index) => ({
    id: start + index,
    iid: start + index,
  })) as GitLabMergeRequestDC[],
  total: 23,
  page: start === 1 ? 1 : 2,
  hasNextPage,
});

describe("MrList pagination", () => {
  let query: {
    data: { pages: ReturnType<typeof makePage>[] };
    isLoading: boolean;
    isFetching: boolean;
    isFetchingNextPage: boolean;
    hasNextPage: boolean;
    error: Error | null;
    fetchNextPage: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    query = {
      data: { pages: [makePage(1, 20, true)] },
      isLoading: false,
      isFetching: false,
      isFetchingNextPage: false,
      hasNextPage: true,
      error: null,
      fetchNextPage: vi.fn(),
    };
    vi.mocked(createInfiniteGitlabQuery).mockReturnValue(
      query as unknown as ReturnType<typeof createInfiniteGitlabQuery>,
    );
    vi.mocked(createGitlabApiQuery).mockReturnValue(
      { data: {} } as unknown as ReturnType<typeof createGitlabApiQuery>,
    );
  });

  const createList = () => new MrList({
    globals: {} as Globals,
    abortSignal: new AbortController().signal,
    projectId: 1,
    selectedProject: null,
    mergeRequestIid: null,
  });

  it("keeps the first page while loading more and combines subsequent pages", () => {
    const list = createList();

    expect(list.mergeRequests).toHaveLength(20);
    expect(list.canLoadMoreLabel).toBe("Загрузить ещё (20 из 23)");
    list.loadMore();
    expect(query.fetchNextPage).toHaveBeenCalledOnce();

    query.isFetching = true;
    query.isFetchingNextPage = true;
    expect(list.isLoading).toBe(false);
    expect(list.showList).toBe(true);
    list.loadMore();
    expect(query.fetchNextPage).toHaveBeenCalledOnce();

    query.isFetching = false;
    query.isFetchingNextPage = false;
    query.data.pages.push(makePage(21, 3, false));
    query.hasNextPage = false;
    expect(list.mergeRequests.map((mr) => mr.iid)).toEqual(
      Array.from({ length: 23 }, (_, index) => index + 1),
    );
    expect(list.canLoadMore).toBe(false);
    list.loadMore();
    expect(query.fetchNextPage).toHaveBeenCalledOnce();
  });
});
