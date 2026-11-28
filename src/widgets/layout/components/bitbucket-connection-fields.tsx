import { observer } from 'mobx-react-lite';
import { t } from '@/shared/lib/i18n';
import type { LayoutVM } from '../model/layout-vm';

export const BitbucketConnectionFields = observer(
  ({ model }: { model: LayoutVM }) => (
    <>
      <label className="mb-4 grid gap-1.5 font-semibold text-sm">
        {t('forge.atlassianEmail')}
        <input
          className="glass-input min-w-0 rounded-xl px-3.5 py-2.5 font-normal"
          type="email"
          autoComplete="off"
          value={model.draftBitbucketEmail}
          onChange={(event) => model.setDraftBitbucketEmail(event.target.value)}
        />
      </label>
      <label className="mb-4 grid gap-1.5 font-semibold text-sm">
        {t('forge.bitbucketWorkspace')}
        <input
          className="glass-input min-w-0 rounded-xl px-3.5 py-2.5 font-normal"
          type="text"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          value={model.draftBitbucketWorkspace}
          onChange={(event) =>
            model.setDraftBitbucketWorkspace(event.target.value)
          }
        />
      </label>
    </>
  ),
);
