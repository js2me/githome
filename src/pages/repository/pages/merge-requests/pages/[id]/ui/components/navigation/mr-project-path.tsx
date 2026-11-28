import { observer } from 'mobx-react-lite';
import { Link } from 'mobx-route/react';
import { Fragment } from 'react';
import { cn } from '@/shared/lib/cn';
import { t } from '@/shared/lib/i18n';
import type { MergeRequestDetailVM } from '../../../model/merge-request-detail';

const segmentClass = 'min-w-0 truncate rounded-sm px-0.5';
const linkClass = cn(
  segmentClass,
  'hover:text-fg-default hover:underline underline-offset-2',
);

export const MrProjectPath = observer(
  ({
    model,
    className,
    trailingSeparator,
  }: {
    model: MergeRequestDetailVM;
    className?: string;
    trailingSeparator?: boolean;
  }) => {
    const { projectPath } = model.markdownScope;
    if (!projectPath) return null;

    const {
      globals: { routes },
      project,
      projectId,
    } = model.parentViewModel;
    const groups = projectPath.split('/');
    const name = groups.pop();
    const isPersonal = project?.namespace?.kind === 'user';

    return (
      <nav
        aria-label={t('navigation.projectPath')}
        className={cn('flex min-w-0 items-center gap-1', className)}
      >
        {groups.map((group, i) => {
          const groupPath = groups.slice(0, i + 1).join('/');
          return (
            <Fragment key={groupPath}>
              {isPersonal ? (
                <span className={segmentClass} title={groupPath}>
                  {group}
                </span>
              ) : (
                <Link
                  className={linkClass}
                  href={routes.group.createUrl({ groupPath }, null, {
                    omitQuery: true,
                  })}
                  title={groupPath}
                >
                  {group}
                </Link>
              )}
              <span aria-hidden="true">/</span>
            </Fragment>
          );
        })}
        {projectId !== null ? (
          <Link
            className={linkClass}
            href={routes.repository.createUrl({ projectId }, null, {
              omitQuery: true,
            })}
            title={projectPath}
          >
            {name}
          </Link>
        ) : (
          <span className={segmentClass} title={projectPath}>
            {name}
          </span>
        )}
        {trailingSeparator && <span aria-hidden="true">/</span>}
      </nav>
    );
  },
);
