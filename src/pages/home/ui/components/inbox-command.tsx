import { Magnifier } from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import { t } from '@/shared/lib/i18n';
import type { InboxCommandModel } from '../../model/inbox-command';

export const InboxCommand = observer(
  ({ model }: { model: InboxCommandModel }) => {
    const { value, busy, error, canSubmit } = model;
    return (
      <form
        className="home-command"
        onSubmit={(event) => {
          event.preventDefault();
          void model.submit();
        }}
      >
        <label className="glass-input home-command-field">
          <Magnifier className="size-4 shrink-0 text-fg-muted" aria-hidden />
          <input
            type="search"
            aria-label={t('workbench.inboxSearch')}
            aria-describedby={error ? 'home-command-error' : undefined}
            aria-invalid={Boolean(error)}
            placeholder={t('workbench.inboxSearch')}
            value={value}
            readOnly={busy}
            spellCheck={false}
            onChange={(event) => model.setValue(event.target.value)}
          />
        </label>
        <button
          className="glass-control rounded-md px-3 text-sm"
          type="submit"
          disabled={!canSubmit}
        >
          {busy ? t('navigation.opening') : t('navigation.open')}
        </button>
        {error && (
          <p
            id="home-command-error"
            role="alert"
            className="col-span-full text-[var(--color-danger-fg)] text-sm"
          >
            {error.message}
          </p>
        )}
      </form>
    );
  },
);
