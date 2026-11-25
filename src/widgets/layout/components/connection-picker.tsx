import { Check, ChevronDown, LogoGitlab, Plus, Xmark } from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import { useViewModel, withPropsViewModel } from 'mobx-view-model-react';
import { GitlabAvatar } from '@/shared/ui/gitlab-avatar';
import { GlassDialog } from '@/shared/ui/glass-dialog';
import { ConnectionButtonVM } from '../model/connection-button';
import type { LayoutVM } from '../model/layout-vm';

const ConnectionButton = withPropsViewModel(ConnectionButtonVM, ({ model }) => {
  const { connection, placement, selected, onClick } = model.payload;
  const { name, host, label, profile } = model;
  const inHeader = placement === 'header';

  return (
    <button
      className={
        inHeader
          ? 'glass-control inline-flex h-9 min-w-0 max-w-[min(60vw,16rem)] items-center gap-2 rounded-xl px-2 text-left sm:px-2.5'
          : 'flex w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-[var(--glass-hover)] aria-pressed:bg-[var(--glass-selected)]'
      }
      type="button"
      aria-label={inHeader ? `Подключения GitLab · ${label}` : label}
      aria-haspopup={inHeader ? 'dialog' : undefined}
      aria-pressed={inHeader ? undefined : selected}
      title={label}
      onClick={onClick}
    >
      {connection && profile && (name || profile.avatar_url) ? (
        <GitlabAvatar
          className={
            inHeader
              ? 'size-6 shrink-0 rounded-full object-cover'
              : 'size-8 shrink-0 rounded-full object-cover'
          }
          connection={connection}
          avatarUrl={profile.avatar_url}
          name={name || host}
        />
      ) : (
        <LogoGitlab
          className="size-5 shrink-0 text-[var(--glass-accent)]"
          aria-hidden
        />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-sm leading-4">
          {name || host}
        </span>
        {name && (
          <span className="block truncate text-[11px] text-fg-muted leading-3.5">
            {host}
          </span>
        )}
      </span>
      {inHeader && (
        <ChevronDown
          className="hidden size-3 shrink-0 text-fg-muted min-[480px]:block"
          aria-hidden
        />
      )}
      {!inHeader && selected && (
        <Check
          className="size-4 shrink-0 text-[var(--glass-accent)]"
          aria-hidden
        />
      )}
    </button>
  );
});

export const ConnectionPicker = observer(() => {
  const model = useViewModel<LayoutVM>();
  const settings = model.globals.stores.settings;

  return (
    <>
      <ConnectionButton
        placement="header"
        connection={settings.activeItem}
        onClick={model.openConnectionPopup}
      />
      <GlassDialog
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
            Подключения GitLab
          </h2>
          <button
            type="button"
            className="glass-control grid size-8 place-items-center rounded-lg"
            aria-label="Закрыть подключения"
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
              <Plus className="size-4" aria-hidden /> Новое подключение
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
            Адрес GitLab
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
            Токен доступа
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
              Адрес Jira{' '}
              <span className="font-normal text-fg-muted">(необязательно)</span>
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
              ? 'Укажите полный адрес HTTP или HTTPS без логина и пароля.'
              : 'Для ссылок на задачи и проекты, когда GitLab не указывает адрес Jira.'}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
            {model.draftConnectionId && (
              <button
                className="glass-control mr-auto rounded-xl px-3 py-2 text-red-700 text-sm dark:text-red-300"
                type="button"
                onClick={model.removeConnection}
              >
                Удалить
              </button>
            )}
            <button
              className="glass-primary rounded-xl px-4 py-2 font-semibold text-sm"
              type="submit"
              disabled={!model.canSubmitConnection}
            >
              {model.draftConnectionId ? 'Сохранить' : 'Подключить'}
            </button>
          </div>
        </form>
      </GlassDialog>
    </>
  );
});
