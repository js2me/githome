import { observer } from 'mobx-react-lite';
import { t } from '@/shared/lib/i18n';

export const ForgeLoadMore = observer(
  ({
    query,
  }: {
    query: {
      hasNextPage: boolean;
      isFetching: boolean;
      fetchNextPage: () => Promise<unknown>;
    };
  }) =>
    query.hasNextPage && (
      <button
        type="button"
        className="glass-control mt-3 rounded-lg px-3 py-2 text-sm"
        disabled={query.isFetching}
        onClick={() => void query.fetchNextPage()}
      >
        {t('forge.loadMore')}
      </button>
    ),
);
