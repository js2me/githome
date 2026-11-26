import { Folder } from '@gravity-ui/icons';
import { Link } from 'mobx-route/react';
import { withViewModel } from 'mobx-view-model-react';
import { t } from '@/shared/lib/i18n';
import { ProjectAvatar } from '@/shared/ui/project-avatar';
import { StatusMessage } from '@/shared/ui/status-message';
import { GroupPageVM } from '../model/page-vm';

const rowClass =
  'glass-control flex min-w-0 items-center gap-3 rounded-xl px-4 py-3 text-sm';

export const GroupPage = withViewModel(GroupPageVM, ({ model }) => {
  const { routes, stores } = model.globals;
  const { data, error, isLoading } = model.overview ?? {};

  return (
    <section className="mx-auto max-w-page">
      {!stores.settings.activeConnection && (
        <StatusMessage>
          {t('group.connectToGitlabToOpenTheGroup')}
        </StatusMessage>
      )}
      {isLoading && <StatusMessage>{t('group.loadingGroup')}</StatusMessage>}
      {error && (
        <StatusMessage error>
          {t('group.couldNotLoadTheGroup')} {error.message}
        </StatusMessage>
      )}
      {data && (
        <>
          <header className="glass-panel mb-5 rounded-2xl p-5 sm:p-6">
            <h1 className="break-words font-semibold text-2xl tracking-tight">
              {data.group.name}
            </h1>
            <p className="break-all text-fg-muted text-sm">
              {data.group.full_path}
            </p>
            {data.group.description && (
              <p className="mt-3 whitespace-pre-wrap break-words text-sm">
                {data.group.description}
              </p>
            )}
          </header>
          {data.subgroups.length > 0 && (
            <section className="mb-5">
              <h2 className="mb-2 font-semibold">{t('group.subgroups')}</h2>
              <ul className="space-y-2">
                {data.subgroups.map((group) => (
                  <li key={group.id}>
                    <Link
                      className={rowClass}
                      href={routes.group.createUrl({
                        groupPath: group.full_path,
                      })}
                    >
                      <Folder className="size-5 shrink-0" aria-hidden />
                      <span className="truncate">{group.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {data.projects.length > 0 && (
            <section>
              <h2 className="mb-2 font-semibold">{t('group.repositories')}</h2>
              <ul className="space-y-2">
                {data.projects.map((project) => (
                  <li key={project.id}>
                    <Link
                      className={rowClass}
                      href={routes.repository.createUrl({
                        projectId: project.id,
                      })}
                    >
                      <ProjectAvatar
                        className="size-5 shrink-0 rounded-md"
                        id={project.id}
                        avatarUrl={project.avatar_url}
                        name={project.name}
                      />
                      <span className="truncate">{project.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {!data.subgroups.length && !data.projects.length && (
            <StatusMessage>
              {t('group.thisGroupHasNoSubgroupsOrRepositories')}
            </StatusMessage>
          )}
        </>
      )}
    </section>
  );
});
