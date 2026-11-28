import { withPropsViewModel } from 'mobx-view-model-react';
import { t } from '@/shared/lib/i18n';
import { ForgeWorkspaceVM } from './model/workspace';
import { ForgeLoadMore } from './ui/load-more';
import { ForgeQueryStatus } from './ui/query-status';
import { ForgeRequestDetails } from './ui/request-details';

const rowClass =
  'glass-control block w-full min-w-0 break-words rounded-lg px-3 py-2 text-left hover:bg-[var(--glass-hover)]';

export const ForgeWorkspace = withPropsViewModel(
  ForgeWorkspaceVM,
  ({ model }) => {
    const { repository, number, repositories, pullRequests } = model;
    const hasDetails = number !== null;
    return (
      <section className="mx-auto grid w-full max-w-4xl gap-4 p-4 sm:p-6">
        {repository && (
          <button
            className="glass-control w-fit rounded-lg px-3 py-2 text-sm"
            type="button"
            onClick={model.goBack}
            disabled={model.createComment.isPending}
          >
            {t('forge.back')}
          </button>
        )}
        {hasDetails ? (
          <ForgeRequestDetails model={model} />
        ) : repository ? (
          <>
            <h1 className="break-words font-bold text-xl">{repository}</h1>
            <h2 className="font-semibold">{t('forge.openPullRequests')}</h2>
            <ForgeQueryStatus query={pullRequests} />
            {pullRequests.data?.pages.every(
              (page) => page.items.length === 0,
            ) &&
              !pullRequests.hasNextPage && <p>{t('forge.noPullRequests')}</p>}
            <ul className="grid gap-2">
              {pullRequests.data?.pages
                .flatMap((page) => page.items)
                .map((request) => (
                  <li key={request.number}>
                    <button
                      className={rowClass}
                      type="button"
                      onClick={() => model.openPullRequest(request.number)}
                    >
                      #{request.number} {request.title}
                    </button>
                  </li>
                ))}
            </ul>
            <ForgeLoadMore query={pullRequests} />
          </>
        ) : (
          <>
            <h1 className="font-bold text-xl">{t('forge.repositories')}</h1>
            <ForgeQueryStatus query={repositories} />
            {repositories.data?.pages.every(
              (page) => page.items.length === 0,
            ) &&
              !repositories.hasNextPage && <p>{t('forge.noRepositories')}</p>}
            <ul className="grid gap-2">
              {repositories.data?.pages
                .flatMap((page) => page.items)
                .map((item) => (
                  <li key={item.id}>
                    <button
                      className={rowClass}
                      type="button"
                      onClick={() => model.openRepository(item)}
                    >
                      {item.path}
                    </button>
                  </li>
                ))}
            </ul>
            <ForgeLoadMore query={repositories} />
          </>
        )}
      </section>
    );
  },
);
