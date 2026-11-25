import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryHistory, createQueryParams } from "mobx-location-history";
import type { Globals } from "@/globals";
import type { GitLabMergeRequestDC } from "@/shared/api/gitlab";
import { createInfiniteGitlabQuery } from "@/shared/lib/gitlab/create-query";
import { MrList } from "./mr-list";

vi.mock("@/shared/lib/gitlab/create-query", () => ({
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
  });

  const createList = (url = "/repository/1/merge-requests") => {
    const history = createMemoryHistory({ initialEntries: [url] });
    return new MrList({
      globals: {
        query: createQueryParams({ history }),
        routes: { mergeRequests: { isOpened: true } },
      } as unknown as Globals,
      unmountSignal: new AbortController().signal,
      projectId: 1,
      selectedProject: null,
      mergeRequestIid: null,
    });
  };

  it("restores the filter from the URL and searches the GitLab list by title or IID", () => {
    const list = createList("/repository/1/merge-requests?state=closed&q=!42");
    const getParams = vi.mocked(createInfiniteGitlabQuery).mock.lastCall![0].params;
    expect(list.searchText).toBe("!42");
    expect(getParams()).toMatchObject({ query: { state: "closed", "iids[]": "42", search: undefined } });

    list.setSearchText("fix menu");
    list.setFilter("merged");
    expect(getParams()).toMatchObject({ query: { state: "merged", search: "fix menu", in: "title", "iids[]": undefined } });
    list.setSearchText("");
    list.setFilter("opened");
    expect(getParams()).toMatchObject({ query: { state: "opened", search: undefined, "iids[]": undefined } });
  });

  it("restores the author's filter across states and clears the scope when leaving it", () => {
    const list = createList("/repository/1/merge-requests?state=mine&q=!42");
    const getParams = vi.mocked(createInfiniteGitlabQuery).mock.lastCall![0].params;

    expect(list.activeFilter.id).toBe("mine");
    expect(getParams()).toMatchObject({
      path: "/projects/1/merge_requests",
      query: { scope: "created_by_me", "iids[]": "42" },
    });
    expect(getParams()).not.toHaveProperty("query.state");

    list.setFilter("closed");
    expect(getParams()).toMatchObject({ query: { state: "closed", "iids[]": "42" } });
    expect(getParams()).not.toHaveProperty("query.scope");
  });

  it("keeps the first page while loading more and combines subsequent pages", () => {
    const list = createList();

    expect(list.mergeRequests).toHaveLength(20);
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
