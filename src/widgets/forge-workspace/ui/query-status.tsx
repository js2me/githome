import { observer } from 'mobx-react-lite';
import { t } from '@/shared/lib/i18n';

export const ForgeQueryStatus = observer(
  ({
    query,
  }: {
    query: { isLoading: boolean; isFetching: boolean; error: Error | null };
  }) => {
    if (query.isLoading) return <p role="status">{t('forge.loading')}</p>;
    if (query.error) return <p role="alert">{query.error.message}</p>;
    return null;
  },
);
