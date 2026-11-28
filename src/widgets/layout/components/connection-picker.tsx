import { Plus, Xmark } from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import { useViewModel } from 'mobx-view-model-react';
import { t } from '@/shared/lib/i18n';
import { GlassDialog } from '@/shared/ui/glass-dialog';
import type { LayoutVM } from '../model/layout-vm';
import { ConnectionButton } from './connection-button';

export const ConnectionPicker = observer(() => {
  const model = useViewModel<LayoutVM>();
  const settings = model.globals.stores.settings;

  return (
    <>
      <ConnectionButton
        placement="header"
        connection={settings.activeItem}
        expanded={model.isConnectionDialogOpen}
        onClick={model.openConnectionPopup}
      />
      <GlassDialog
        id="workbench-connections-dialog"
        ref={model.connectionDialog}
        onClose={model.onConnectionDialogClosed}
        aria-labelledby="connections-title"
        className="max-h-[calc(100dvh-2rem)] w-[min(27rem,calc(100%-2rem))] overflow-y-auto p-5 sm:p-6"
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2
            id="connections-title"
            className="font-bold text-xl tracking-tight"
          >
            {t('connection.gitlabConnections2')}
          </h2>
          <button
            type="button"
            className="glass-control grid size-8 place-items-center rounded-lg"
            aria-label={t('connection.closeConnections')}
            onClick={model.closeConnectionPopup}
          >
            <Xmark className="size-4" aria-hidden />
          </button>
        </div>
        {model.isConnectionDialogOpen && settings.connections.length > 0 && (
          <div className="mb-5 flex max-h-44 flex-col gap-1 overflow-y-auto border-[var(--glass-border)] border-b pb-4">
            {settings.connections.map((connection) => (
              <ConnectionButton
                key={connection.id}
                placement="list"
                connection={connection}
                selected={model.draftConnectionId === connection.id}
                onClick={() => model.selectConnection(connection.id)}
              />
            ))}
            <button
              type="button"
              aria-pressed={!model.draftConnectionId}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 font-semibold text-[var(--glass-accent)] text-sm hover:bg-[var(--glass-hover)] aria-pressed:bg-[var(--glass-selected)]"
              onClick={model.selectNewConnection}
            >
              <Plus className="size-4" aria-hidden />{' '}
              {t('connection.newConnection')}
            </button>
          </div>
        )}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            model.saveConnection();
          }}
        >
          <label className="mb-4 grid gap-1.5 font-semibold text-sm">
            {t('connection.gitlabAddress')}
            <input
              ref={model.connectionUrlInput}
              className="glass-input min-w-0 rounded-xl px-3.5 py-2.5 font-normal"
              type="text"
              inputMode="url"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="https://gitlab.com"
              value={model.draftGitlabUrl}
              onChange={(event) => model.setDraftGitlabUrl(event.target.value)}
            />
          </label>
          <label className="grid gap-1.5 font-semibold text-sm">
            {t('connection.accessToken')}
            <input
              className="glass-input min-w-0 rounded-xl px-3.5 py-2.5 font-normal"
              type="password"
              autoComplete="off"
              placeholder="glpat-…"
              value={model.draftGitToken}
              onChange={(event) => model.setDraftGitToken(event.target.value)}
            />
          </label>
          <label className="mt-4 grid gap-1.5 font-semibold text-sm">
            <span>
              {t('connection.jiraAddress')}{' '}
              <span className="font-normal text-fg-muted">
                {t('connection.optional')}
              </span>
            </span>
            <input
              className="glass-input min-w-0 rounded-xl px-3.5 py-2.5 font-normal"
              type="url"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="https://company.atlassian.net"
              value={model.draftJiraUrl}
              aria-invalid={model.isDraftJiraUrlInvalid || undefined}
              aria-describedby="connection-jira-hint"
              onChange={(event) => model.setDraftJiraUrl(event.target.value)}
            />
          </label>
          <p id="connection-jira-hint" className="mt-1.5 text-fg-muted text-xs">
            {model.isDraftJiraUrlInvalid
              ? t('connection.enterAFullHttpOrHttpsAddress')
              : t('connection.usedForIssueAndProjectLinksWhen')}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
            {model.draftConnectionId && (
              <button
                className="glass-control mr-auto rounded-xl px-3 py-2 text-red-700 text-sm dark:text-red-300"
                type="button"
                onClick={model.removeConnection}
              >
                {t('review.delete')}
              </button>
            )}
            <button
              className="glass-primary rounded-xl px-4 py-2 font-semibold text-sm"
              type="submit"
              disabled={!model.canSubmitConnection}
            >
              {model.draftConnectionId
                ? t('common.save')
                : t('connection.connect')}
            </button>
          </div>
        </form>
      </GlassDialog>
    </>
  );
});
