import type { LabelOption } from '../../../../model/metadata/editor';

const hexColor = (value: string | undefined) => {
  const hex = value?.replace(/^#/, '');
  if (hex && /^[0-9a-f]{6}$/i.test(hex)) return hex;
  if (hex && /^[0-9a-f]{3}$/i.test(hex))
    return [...hex].map((ch) => ch.repeat(2)).join('');
};

const foreground = (hex: string) => {
  const rgb = [0, 2, 4].map((index) => {
    const channel = Number.parseInt(hex.slice(index, index + 2), 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722 > 0.179
    ? '#000'
    : '#fff';
};

export const LabelChip = ({ label }: { label: LabelOption }) => {
  const hex = hexColor(label.color);
  const split = label.name.lastIndexOf('::');
  const scoped = split > 0 && split < label.name.length - 2;
  return (
    <span
      className="inline-flex min-w-0 max-w-full overflow-hidden rounded-full bg-[var(--glass-selected)] font-medium text-fg-default text-xs [overflow-wrap:anywhere]"
      style={
        hex ? { backgroundColor: `#${hex}`, color: foreground(hex) } : undefined
      }
      title={label.description || label.name}
    >
      {scoped ? (
        <>
          <span className="border-current/25 border-r px-2 py-0.5">
            {label.name.slice(0, split)}
          </span>
          <span className="sr-only">::</span>
          <span className="px-2 py-0.5">{label.name.slice(split + 2)}</span>
        </>
      ) : (
        <span className="px-2 py-0.5">{label.name}</span>
      )}
    </span>
  );
};
