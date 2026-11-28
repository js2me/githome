import { CodePullRequest, House, Xmark } from '@gravity-ui/icons';
import { withViewModel } from 'mobx-view-model-react';
import { t } from '@/shared/lib/i18n';
import { WorkspacePicker } from '../components/workspace/workspace-picker';
import { WorkspaceTabsVM } from '../model/workspace/workspace-tabs';

export const WorkspaceTabs = withViewModel(WorkspaceTabsVM, ({ model }) => {
  const { routes, navigation } = model.globals;
  const { activeItemId } = navigation.mergeRequests;
  const { items, activeTab, homeTab } = model;

  return (
    <div className="workbench-tabs">
      <WorkspacePicker />
      <nav
        className="workbench-tab-scroll"
        aria-label={t('workbench.openTabs')}
      >
        <button
          ref={homeTab}
          type="button"
          className="workbench-tab workbench-tab-home"
          aria-current={routes.home.isOpened ? 'page' : undefined}
          onClick={model.openHome}
        >
          <House className="size-4" aria-hidden />
          {t('workbench.home')}
        </button>
        {items.map((item) => {
          const current = item.id === activeItemId;
          const { mergeRequestIid, projectPath } = item.payload;
          const title = item.title || t('common.mergeRequest');
          const label = `${projectPath ? `${projectPath} ` : ''}!${mergeRequestIid} · ${title}`;
          return (
            <div
              className="workbench-tab workbench-mr-tab"
              key={item.id}
              data-current={current}
              onMouseDown={(event) => {
                if (event.button === 1) event.preventDefault();
              }}
              onAuxClick={(event) => {
                if (event.button !== 1) return;
                event.preventDefault();
                model.close(item, event.currentTarget);
              }}
            >
              <button
                ref={current ? activeTab : undefined}
                type="button"
                title={label}
                aria-current={current ? 'page' : undefined}
                className="workbench-tab-target"
                onClick={() => navigation.mergeRequests.select(item)}
              >
                <CodePullRequest className="size-4 text-brand" aria-hidden />
                <span className="workbench-tab-iid">!{mergeRequestIid}</span>
                <span className="truncate">{title}</span>
              </button>
              <button
                type="button"
                className="workbench-tab-close"
                aria-label={t('navigation.close', { v1: label })}
                title={t('navigation.closeItem')}
                onClick={(event) => model.close(item, event.currentTarget)}
              >
                <Xmark className="size-3.5" aria-hidden />
              </button>
            </div>
          );
        })}
      </nav>
    </div>
  );
});
