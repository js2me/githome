const dateFormat = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export const DateTime = ({ value }: { value: string }) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return <>{value}</>;
  return (
    <time dateTime={value} title={date.toLocaleString('ru-RU')}>
      {dateFormat.format(date)}
    </time>
  );
};
