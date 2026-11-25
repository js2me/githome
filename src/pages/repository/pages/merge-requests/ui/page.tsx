import { CodePullRequest, Magnifier, Xmark } from "@gravity-ui/icons";
import { withViewModel } from "mobx-view-model-react";
import { MR_FILTERS } from "@/entities/gitlab-merge-requests/model/mr-list";
import { cn } from "@/shared/lib/cn";
import { LoadMoreSentinel } from "@/shared/ui/load-more-sentinel";
import { StatusMessage } from "@/shared/ui/status-message";
import { MergeRequestsPageVM } from "../model";
import { MergeRequestListRows } from "./components/merge-request-list";

export const MergeRequestsPage = withViewModel(MergeRequestsPageVM, ({ model }) => {
  const { mrList } = model;
  if (!mrList) return null;

  return (
    <section className="mx-auto w-full max-w-[1180px]" aria-labelledby="mr-list-heading">
      <h2
        id="mr-list-heading"
        className="mb-5 flex items-center gap-3 text-2xl font-semibold tracking-tight sm:text-[30px]"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--glass-selected)] text-[var(--glass-accent)]" aria-hidden>
          <CodePullRequest width={21} height={21} />
        </span>
        Merge requests
      </h2>

      <div className="glass-panel overflow-hidden rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--glass-border)] p-3 sm:p-4">
          <div className="grid w-full grid-cols-2 gap-1 min-[440px]:flex min-[440px]:w-auto" role="group" aria-label="Фильтры merge requests">
            {MR_FILTERS.map((filter) => {
              const active = mrList.activeFilter.id === filter.id;
              return (
                <button
                  className={cn(
                    "cursor-pointer rounded-lg px-2.5 py-2 text-sm font-semibold transition-colors sm:px-3",
                    active
                      ? "bg-[var(--glass-selected)] text-[var(--glass-accent)]"
                      : "text-fg-muted hover:bg-[var(--glass-hover)] hover:text-fg-default",
                  )}
                  key={filter.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => mrList.setFilter(filter.id)}
                >
                  {filter.label}
                  {active && mrList.resultCount != null && (
                    <span className="ml-1.5 rounded-md bg-[var(--glass-control)] px-1.5 py-0.5 text-xs tabular-nums">
                      {mrList.resultCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <form
            role="search"
            className="relative flex w-full items-center sm:w-72"
            onSubmit={(event) => {
              event.preventDefault();
              mrList.applySearch();
            }}
          >
            <Magnifier width={16} height={16} className="pointer-events-none absolute left-3 text-fg-muted" aria-hidden />
            <input
              className="glass-input h-10 w-full rounded-xl pr-10 pl-9 text-sm"
              type="text"
              inputMode="search"
              aria-label="Поиск merge requests по названию или номеру"
              placeholder="Название или !номер"
              value={mrList.searchText}
              onChange={(event) => mrList.setSearchText(event.target.value)}
            />
            {mrList.searchText && (
              <button
                type="button"
                aria-label="Очистить поиск"
                className="absolute right-1 grid size-8 cursor-pointer place-items-center rounded-lg text-fg-muted hover:bg-[var(--glass-hover)] hover:text-fg-default"
                onClick={() => mrList.setSearchText("")}
              >
                <Xmark width={14} height={14} aria-hidden />
              </button>
            )}
          </form>
        </div>

        {mrList.isLoading && (
          <p role="status" className="p-8 text-center text-sm text-fg-muted">Загружаем merge requests…</p>
        )}

        {mrList.showEmptyListMessage && (
          <div role="status" className="grid justify-items-center gap-3 px-5 py-12 text-center">
            <span className="grid size-11 place-items-center rounded-xl bg-[var(--glass-control)] text-fg-muted" aria-hidden>
              {mrList.appliedSearch ? <Magnifier /> : <CodePullRequest />}
            </span>
            <p className="text-sm font-semibold">
              {mrList.appliedSearch ? "По вашему запросу ничего не найдено" : mrList.activeFilter.empty}
            </p>
            {mrList.appliedSearch && (
              <button
                className="glass-control rounded-lg px-3 py-1.5 text-sm"
                type="button"
                onClick={() => mrList.setSearchText("")}
              >
                Сбросить поиск
              </button>
            )}
          </div>
        )}

        {mrList.showList && (
          <ul className="m-0 list-none divide-y divide-[var(--glass-border)] p-0">
            {mrList.pages.map((page) => (
              <MergeRequestListRows
                key={page.page}
                project={model.selectedProject}
                mergeRequests={page.items}
                selectedMergeRequestIid={mrList.selectedMergeRequestIid}
                onSelect={mrList.openMergeRequest}
              />
            ))}
          </ul>
        )}

        {mrList.showLoadError && (
          <div role="alert" className="px-4 pb-4">
            <StatusMessage error>
              <span>Не удалось загрузить список. {mrList.errorMessage}</span>
              <button className="glass-control ml-3 rounded-lg px-2.5 py-1" type="button" onClick={mrList.retry}>
                Повторить
              </button>
            </StatusMessage>
          </div>
        )}

        {mrList.showList && mrList.canLoadMore && !mrList.showLoadError && (
          <LoadMoreSentinel disabled={mrList.isFetching} onLoadMore={mrList.loadMore} />
        )}
        {mrList.isFetchingNextPage && (
          <p role="status" className="px-4 py-3 text-center text-sm text-fg-muted">
            Загружаем ещё merge requests…
          </p>
        )}
      </div>
    </section>
  );
});
