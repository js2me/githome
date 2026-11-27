import { t } from '@/shared/lib/i18n';

export const durationLabel = (seconds?: number | null) => {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return null;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return minutes > 0
    ? t('pipelines.minS', { v1: minutes, v2: rest })
    : t('pipelines.s', { v1: rest });
};
