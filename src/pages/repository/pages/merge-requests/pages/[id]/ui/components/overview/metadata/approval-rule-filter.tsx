import { observer } from 'mobx-react-lite';
import { t } from '@/shared/lib/i18n';
import type { MrMetadataEditor } from '../../../../model/metadata/editor';

export const ApprovalRuleFilter = observer(
  ({ model }: { model: MrMetadataEditor }) => {
    if (!model.approvalRules.length) return null;
    const rule = model.selectedRule;
    return (
      <>
        <label className="grid gap-1 text-sm">
          {t('mrMetadata.approvalRule')}
          <select
            className="glass-input min-h-9 rounded-lg px-2"
            value={rule?.id ?? ''}
            onChange={(event) => model.selectRule(event.currentTarget.value)}
          >
            <option value="">{t('mrMetadata.allReviewers')}</option>
            {model.approvalRules.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        {rule && (
          <p className="text-fg-muted text-xs">
            {t('mrMetadata.approvalProgress', {
              approvals: rule.approved_by?.length ?? 0,
              required: rule.approvals_required,
            })}
          </p>
        )}
      </>
    );
  },
);
