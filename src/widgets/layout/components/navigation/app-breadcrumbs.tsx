import { ChevronRight } from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import { Link } from 'mobx-route/react';
import { useViewModel } from 'mobx-view-model-react';
import { Fragment } from 'react';
import { t } from '@/shared/lib/i18n';
import { ProjectAvatar } from '@/shared/ui/project-avatar';
import type { LayoutVM } from '../../model/layout-vm';

const crumbClass = 'min-w-0 truncate rounded-md px-1.5 py-1';
const linkClass = `${crumbClass} hover:bg-[var(--glass-hover)]`;

export const AppBreadcrumbs = observer(() => {
  const model = useViewModel<LayoutVM>();
  const { routes } = model.globals;
  const project = model.repositoryBreadcrumb;
  const groupPath = routes.group.params?.groupPath;
  const section = model.currentSection;
  const projectParts = project?.path_with_namespace.split('/') ?? [];
  const projectSlug = projectParts.pop();
  const groups = groupPath ? groupPath.split('/') : projectParts;

  if (!project && !groupPath) return null;

  return (
    <nav
      aria-label={
        project ? t('navigation.projectPath') : t('navigation.groupPath')
      }
      className="workbench-breadcrumbs"
    >
      {groups.map((name, i) => {
        const path = groups.slice(0, i + 1).join('/');
        const current = !project && i === groups.length - 1;
        return (
          <Fragment key={path}>
            {i > 0 && <span aria-hidden="true">/</span>}
            {current || project?.namespace?.kind === 'user' ? (
              <span
                aria-current={current ? 'page' : undefined}
                className={crumbClass}
                title={path}
              >
                {name}
              </span>
            ) : (
              <Link
                className={linkClass}
                href={routes.group.createUrl({ groupPath: path })}
                title={path}
              >
                {name}
              </Link>
            )}
          </Fragment>
        );
      })}
      {project && (
        <>
          {groups.length > 0 && <span aria-hidden="true">/</span>}
          <button
            type="button"
            title={project.path_with_namespace}
            aria-current={section ? undefined : 'page'}
            onClick={model.openRepository}
            className={`flex cursor-pointer items-center gap-1.5 ${linkClass}`}
          >
            <ProjectAvatar
              className="size-3.5 shrink-0 rounded-sm"
              id={project.id}
              avatarUrl={project.avatar_url}
              name={project.name}
            />
            <span className="truncate">{projectSlug || project.name}</span>
          </button>
        </>
      )}
      {section && (
        <>
          <ChevronRight className="size-3 shrink-0" aria-hidden />
          <button
            type="button"
            onClick={section.open}
            className="shrink-0 cursor-pointer rounded-md px-1.5 py-1 text-fg-default hover:bg-[var(--glass-hover)]"
          >
            {section.label}
          </button>
        </>
      )}
      {model.showMergeRequestBreadcrumb && (
        <>
          <ChevronRight className="size-3 shrink-0" aria-hidden />
          <span aria-current="page" className="font-mono font-semibold text-xs">
            !{model.mergeRequestIid}
          </span>
        </>
      )}
    </nav>
  );
});
