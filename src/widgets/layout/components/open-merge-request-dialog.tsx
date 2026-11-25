import { Link, Xmark } from '@gravity-ui/icons';
import { withViewModel } from 'mobx-view-model-react';
import { GlassDialog } from '@/shared/ui/glass-dialog';
import { OpenMergeRequestVM } from '../model/open-merge-request';

export const OpenMergeRequestDialog = withViewModel(
  OpenMergeRequestVM,
  ({ model }) => (
    <>
      <button
        type="button"
        className="glass-primary inline-flex h-9 shrink-0 items-center gap-2 rounded-xl px-3 font-semibold text-sm sm:px-3.5"
        aria-haspopup="dialog"
        aria-label="Открыть MR"
        title="Открыть MR"
        aria-keyshortcuts="Control+K Meta+K"
        onClick={model.open}
      >
        <Link className="size-4" aria-hidden />
        <span>
          <span className="hidden min-[420px]:inline">Открыть </span>MR
        </span>
        <kbd
          aria-hidden
          className="hidden rounded border border-current/35 px-1 py-0.5 font-medium font-sans text-[10px] leading-none lg:inline"
        >
          {/Mac|iPad|iPhone/.test(navigator.platform) ? '⌘ K' : 'Ctrl K'}
        </kbd>
      </button>
      <GlassDialog
        ref={model.dialog}
        className="w-[min(28rem,calc(100%-2rem))] p-5 sm:p-6"
        aria-labelledby="open-mr-title"
        onClose={(event) => {
          if (!event.currentTarget.open) model.reset();
        }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void model.submit();
          }}
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 id="open-mr-title" className="font-bold text-xl tracking-tight">
              Открыть мерж-реквест
            </h2>
            <button
              type="button"
              className="glass-control grid size-8 place-items-center rounded-lg"
              aria-label="Закрыть"
              onClick={() => model.dialog.current?.close()}
            >
              <Xmark className="size-4" aria-hidden />
            </button>
          </div>
          <label className="grid gap-2 font-semibold text-sm">
            Ссылка на MR в GitLab
            <input
              ref={model.input}
              className="glass-input min-w-0 rounded-xl px-3.5 py-3 font-normal text-sm"
              type="text"
              inputMode="url"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              readOnly={model.pending}
              value={model.link}
              placeholder="https://gitlab.com/group/project/-/merge_requests/42"
              aria-invalid={Boolean(model.error)}
              aria-describedby={model.error ? 'open-mr-error' : undefined}
              onChange={(event) => model.setLink(event.target.value)}
            />
          </label>
          {model.error && (
            <p
              id="open-mr-error"
              role="alert"
              className="mt-2 text-red-700 text-sm dark:text-red-300"
            >
              {model.error}
            </p>
          )}
          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              disabled={!model.link.trim() || model.pending}
              className="glass-primary rounded-xl px-4 py-2 font-semibold text-sm"
            >
              {model.pending ? 'Открываем…' : 'Открыть'}
            </button>
          </div>
        </form>
      </GlassDialog>
    </>
  ),
);
