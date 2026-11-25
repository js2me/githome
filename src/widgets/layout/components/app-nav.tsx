import { ChevronRight } from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import { useViewModel } from 'mobx-view-model-react';
import { ProjectAvatar } from '@/shared/ui/project-avatar';
import logo from '../../../../resources/icons/128x128.png';
import type { LayoutVM } from '../model/layout-vm';
import { ConnectionPicker } from './connection-picker';
import { OpenMergeRequestDialog } from './open-merge-request-dialog';
import { SettingsDialog } from './settings-dialog';

export const AppNav = observer(() => {
  const model = useViewModel<LayoutVM>();
  const project = model.repositoryBreadcrumb;
  const section = model.currentSection;
  return (
    <header className="glass-bar relative z-40 border-b px-3 sm:px-5 lg:px-7">
      <div className="flex min-h-16 min-w-0 flex-wrap items-center gap-x-2 gap-y-1 py-2.5 sm:gap-x-4">
        <button
          className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg"
          type="button"
          aria-label="GitHome — на главную"
          onClick={model.openHome}
        >
          <img src={logo} alt="" className="size-7 sm:size-8" />
          <span className="font-bold text-lg tracking-tight sm:text-xl">
            GitHome
          </span>
        </button>
        {project && (
          <nav
            aria-label="Путь к проекту"
            className="order-last flex w-full min-w-0 items-center gap-1 py-1 font-medium text-fg-muted text-xs sm:text-sm lg:order-none lg:w-auto lg:flex-1 lg:border-[var(--glass-border)] lg:border-l lg:pl-4"
          >
            <button
              type="button"
              title={project.path_with_namespace}
              onClick={model.openRepository}
              className="flex min-w-0 cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 hover:bg-[var(--glass-hover)]"
            >
              <ProjectAvatar
                className="size-5 shrink-0 rounded-md"
                id={project.id}
                avatarUrl={project.avatar_url}
                name={project.name}
              />
              <span className="truncate">{project.path_with_namespace}</span>
            </button>
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
                <span
                  aria-current="page"
                  className="font-mono font-semibold text-xs"
                >
                  !{model.mergeRequestIid}
                </span>
              </>
            )}
          </nav>
        )}
        <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2">
          {model.globals.stores.settings.connections.length > 0 && (
            <OpenMergeRequestDialog />
          )}
          <ConnectionPicker />
          <SettingsDialog />
        </div>
      </div>
    </header>
  );
});
