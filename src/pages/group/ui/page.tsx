import { ChevronUp, Folders } from '@gravity-ui/icons';
import { withViewModel } from 'mobx-view-model-react';
import { t } from '@/shared/lib/i18n';
import { StatusMessage } from '@/shared/ui/status-message';
import { GroupPageVM } from '../model/page-vm';
import { GroupTree } from './group-tree';
import './group-workspace.css';

export const GroupPage = withViewModel(GroupPageVM, ({ model }) => {
  const { routes, stores } = model.globals;
  const { data, error, isLoading } = model.overview ?? {};
  const groupPath =
    data?.group.full_path || routes.group.params?.groupPath || '';
  const groupName = data?.group.name || groupPath.split('/').at(-1);
  const hasContents =
    data && (data.subgroups.length > 0 || data.projects.length > 0);

  return (
    <section
      className="group-workspace"
      aria-labelledby="group-workspace-title"
    >
      <header className="group-workspace-summary">
        <span className="group-workspace-icon" aria-hidden="true">
          <Folders className="size-5" />
        </span>
        <div className="min-w-0">
          <h1 id="group-workspace-title">{groupName}</h1>
          <p className="group-workspace-path">{groupPath}</p>
          {data?.group.description && (
            <p className="group-workspace-description">
              {data.group.description}
            </p>
          )}
        </div>
      </header>
      {!stores.settings.activeConnection && (
        <StatusMessage className="m-4">
          {t('group.connectToGitlabToOpenTheGroup')}
        </StatusMessage>
      )}
      {isLoading && (
        <StatusMessage className="m-4">{t('group.loadingGroup')}</StatusMessage>
      )}
      {error && (
        <StatusMessage className="m-4" error>
          {t('group.couldNotLoadTheGroup')} {error.message}{' '}
          <button
            type="button"
            className="cursor-pointer underline"
            onClick={() => void model.overview?.refetch()}
          >
            {t('common.retry')}
          </button>
        </StatusMessage>
      )}
      {data &&
        (hasContents ? (
          <section aria-labelledby="group-tree-title">
            <header className="group-tree-toolbar">
              <h2 id="group-tree-title">{t('group.tree')}</h2>
              {data.subgroups.length > 0 && (
                <button
                  type="button"
                  className="glass-control group-tree-collapse"
                  disabled={model.expanded.size === 0}
                  onClick={model.collapseAll}
                >
                  <ChevronUp className="size-3.5" aria-hidden />
                  {t('group.collapseAll')}
                </button>
              )}
            </header>
            <div className="group-tree-columns" aria-hidden="true">
              <span>{t('group.name')}</span>
              <span>{t('group.path')}</span>
            </div>
            <GroupTree contents={data} tree={model} />
          </section>
        ) : (
          <StatusMessage className="m-4">
            {t('group.thisGroupHasNoSubgroupsOrRepositories')}
          </StatusMessage>
        ))}
    </section>
  );
});
