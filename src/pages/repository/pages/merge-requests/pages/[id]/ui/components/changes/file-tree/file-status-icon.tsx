import {
  ArrowRightArrowLeft,
  CircleMinusFill,
  CirclePlusFill,
  Pencil,
} from '@gravity-ui/icons';
import type { ChangeFileStatus } from '@/shared/lib/build-changes-tree';

const fileStatuses = {
  added: { Icon: CirclePlusFill, label: 'Добавлен' },
  deleted: { Icon: CircleMinusFill, label: 'Удалён' },
  modified: { Icon: Pencil, label: 'Изменён' },
  renamed: { Icon: ArrowRightArrowLeft, label: 'Переименован' },
} satisfies Record<ChangeFileStatus, { Icon: typeof Pencil; label: string }>;

export const FileStatusIcon = ({ status }: { status: ChangeFileStatus }) => {
  const { Icon, label } = fileStatuses[status];

  return (
    <span
      className={`changes-file-tree__status-icon changes-file-tree__status-icon--${status}`}
      role="img"
      aria-label={label}
      title={label}
    >
      <Icon width={14} height={14} aria-hidden />
    </span>
  );
};
