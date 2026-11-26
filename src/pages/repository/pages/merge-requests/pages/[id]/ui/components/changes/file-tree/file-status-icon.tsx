import {
  ArrowRightArrowLeft,
  CircleMinusFill,
  CirclePlusFill,
  Pencil,
} from '@gravity-ui/icons';
import { observer } from 'mobx-react-lite';
import type { ChangeFileStatus } from '@/shared/lib/file-tree/build-changes-tree';
import { t } from '@/shared/lib/i18n';

const fileStatuses = {
  added: {
    Icon: CirclePlusFill,
    get label() {
      return t('review.added');
    },
  },
  deleted: {
    Icon: CircleMinusFill,
    get label() {
      return t('review.deleted');
    },
  },
  modified: {
    Icon: Pencil,
    get label() {
      return t('review.modified');
    },
  },
  renamed: {
    Icon: ArrowRightArrowLeft,
    get label() {
      return t('review.renamed');
    },
  },
} satisfies Record<ChangeFileStatus, { Icon: typeof Pencil; label: string }>;

export const FileStatusIcon = observer(
  ({ status }: { status: ChangeFileStatus }) => {
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
  },
);
