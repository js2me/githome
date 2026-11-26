import { observer } from 'mobx-react-lite';
import { getLocale } from '@/shared/lib/i18n';

const dateFormatOptions: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
};

export const DateTime = observer(({ value }: { value: string }) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return <>{value}</>;
  return (
    <time dateTime={value} title={date.toLocaleString(getLocale())}>
      {date.toLocaleString(getLocale(), dateFormatOptions)}
    </time>
  );
});
