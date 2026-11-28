import { ArrowRight, LogoGitlab } from '@gravity-ui/icons';
import { withViewModel } from 'mobx-view-model-react';
import { t } from '@/shared/lib/i18n';
import logo from '../../../../resources/icons/128x128.png';
import { HomePageVM } from '../model';
import { InboxCommand } from './components/inbox-command';
import { ProjectExplorer } from './components/project-explorer';
import { RecentRequests } from './components/recent-requests';
import { ReviewInbox } from './components/review-inbox';
import './page.css';

export const HomePage = withViewModel(
  HomePageVM,
  ({ model }) => {
    if (!model.isConfigured) {
      return (
        <section className="home-welcome glass-panel mx-auto max-w-page rounded-lg">
          <div className="relative z-10 max-w-lg">
            <LogoGitlab
              className="mb-6 size-9 text-[var(--glass-accent)]"
              aria-hidden
            />
            <h1 className="font-semibold text-2xl tracking-tight sm:text-3xl">
              {t('common.connectToGitlab')}
            </h1>
            <p className="mt-3 max-w-sm text-fg-muted text-sm leading-relaxed sm:text-base">
              {t('home.enterTheServerAddressAndAnAccess')}
            </p>
            <button
              type="button"
              className="glass-primary mt-6 inline-flex items-center gap-3 rounded-md px-4 py-2.5 font-semibold text-sm"
              onClick={model.parentViewModel.openConnectionPopup}
            >
              {t('home.setUpAConnection')}{' '}
              <ArrowRight className="size-4" aria-hidden />
            </button>
          </div>
        </section>
      );
    }

    return (
      <div className="home-dashboard">
        <header className="home-dashboard-header">
          <div className="home-dashboard-identity">
            <img src={logo} alt="" width={32} height={32} />
            <div className="min-w-0">
              <h1>GitHome</h1>
              <p className="home-connection" title={model.connectionLabel}>
                {model.connectionLabel}
              </p>
            </div>
          </div>
          <div className="home-dashboard-search">
            <InboxCommand model={model.command} />
            <p className="home-start-hint">{t('workbench.inboxHint')}</p>
          </div>
        </header>
        <div className="home-dashboard-grid">
          <ReviewInbox reviewInbox={model.reviewInbox} />
          <div className="home-dashboard-sidebar">
            <ProjectExplorer model={model} />
            <RecentRequests model={model} />
          </div>
        </div>
      </div>
    );
  },
  { id: 'home' },
);
