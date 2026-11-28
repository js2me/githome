import { observer } from 'mobx-react-lite';
import { t } from '@/shared/lib/i18n';
import type { GithubRepositoryModel } from '../../model/github/repository';
import { GithubFiles } from './files';
import { GithubPullRequestList } from './pull-request-list';
import { GithubTabs } from './tabs';

export const GithubRepository = observer(
  ({ model }: { model: GithubRepositoryModel }) => (
    <>
      <header className="grid min-w-0 gap-3 border-[var(--glass-border)] border-b pb-3">
        <h1 className="break-words font-bold text-xl">
          {model.scope?.repository}
        </h1>
        <GithubTabs
          label={model.scope?.repository ?? 'GitHub'}
          tabs={[
            {
              label: t('forge.pullRequests'),
              active: !model.isFiles,
              onSelect: () => model.setView('pulls'),
            },
            {
              label: t('common.files'),
              active: model.isFiles,
              onSelect: () => model.setView('files'),
            },
          ]}
        />
      </header>
      {model.isFiles ? (
        <GithubFiles model={model} />
      ) : (
        <GithubPullRequestList model={model} />
      )}
    </>
  ),
);
