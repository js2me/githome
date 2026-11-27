import { observer } from 'mobx-react-lite';
import { t } from '@/shared/lib/i18n';
import type { MrMetadataEditor } from '../../../../model/metadata/editor';

export const CreateLabelForm = observer(
  ({ model }: { model: MrMetadataEditor }) => (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        void model.saveLabel();
      }}
    >
      <label className="grid gap-1 text-sm">
        {t('mrMetadata.labelName')}
        <input
          className="glass-input rounded-lg px-3 py-2"
          required
          value={model.labelName}
          onChange={(event) =>
            model.updateLabelDraft('name', event.currentTarget.value)
          }
        />
      </label>
      <label className="grid gap-1 text-sm">
        {t('mrMetadata.labelDescription')}
        <textarea
          className="glass-input min-h-16 rounded-lg px-3 py-2"
          value={model.labelDescription}
          onChange={(event) =>
            model.updateLabelDraft('description', event.currentTarget.value)
          }
        />
      </label>
      <label className="flex items-center gap-3 text-sm">
        {t('mrMetadata.labelColor')}
        <input
          type="color"
          className="glass-input h-9 w-12 cursor-pointer rounded-lg p-1"
          value={model.labelColor}
          onChange={(event) =>
            model.updateLabelDraft('color', event.currentTarget.value)
          }
        />
        <span className="font-mono text-fg-muted text-xs">
          {model.labelColor}
        </span>
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          className="glass-primary min-h-9 rounded-lg px-3 text-sm"
          disabled={model.busy || !model.labelName.trim()}
        >
          {t('mrMetadata.createAndApply')}
        </button>
        <button
          type="button"
          className="glass-control min-h-9 rounded-lg px-3 text-sm"
          disabled={model.busy}
          onClick={model.cancelLabel}
        >
          {t('common.cancel')}
        </button>
      </div>
    </form>
  ),
);
