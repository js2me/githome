import { ChevronRight, Clock } from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import { t } from '@/shared/lib/i18n';
import type { HomePageVM } from '../../model';

export const RecentRequests = observer(({ model }: { model: HomePageVM }) => (
  <section className="home-panel" aria-labelledby="home-recent-title">
    <header className="home-panel-header">
      <h2 id="home-recent-title">
        <Clock className="size-4 text-fg-muted" aria-hidden />
        {t('home.recentMergeRequests')}
      </h2>
    </header>
    {model.recentMergeRequests.length ? (
      <ul className="home-recent-list list-none">
        {model.recentMergeRequests.map((item) => (
          <li key={item.id}>
            <button
              className="home-recent-row"
              type="button"
              onClick={() => model.openRecentRequest(item)}
            >
              <span className="min-w-0">
                <span
                  className="block truncate font-medium text-sm"
                  title={item.title}
                >
                  {item.title}
                </span>
                <span className="block truncate font-mono text-fg-muted text-xs">
                  {item.payload.projectPath}!{item.payload.mergeRequestIid}
                </span>
              </span>
              <ChevronRight
                className="size-3.5 shrink-0 text-fg-muted"
                aria-hidden
              />
            </button>
          </li>
        ))}
      </ul>
    ) : (
      <p className="home-explorer-message">{t('home.noRecentMergeRequests')}</p>
    )}
  </section>
));
