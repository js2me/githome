import { observer } from 'mobx-react-lite';
import { getLocale } from '@/shared/lib/i18n';

const shortDateOptions: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
};

const fullDateOptions: Intl.DateTimeFormatOptions = {
  dateStyle: 'long',
  timeStyle: 'short',
};

export const Timestamp = observer(function Timestamp({
  value,
}: {
  value: string;
}) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return <>{value}</>;
  return (
    <time
      dateTime={value}
      title={date.toLocaleString(getLocale(), fullDateOptions)}
    >
      {date.toLocaleString(getLocale(), shortDateOptions)}
    </time>
  );
});
