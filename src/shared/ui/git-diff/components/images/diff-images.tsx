import { observer } from 'mobx-react-lite';
import { t } from '@/shared/lib/i18n';
import type { FileGitDiffImages } from '../../model/file-git-diff/content/images';
import { DiffImageViewer } from './diff-image-viewer';
import { ImagePanel } from './image-panel';

export const DiffImages = observer(
  ({ images }: { images: FileGitDiffImages }) => {
    const { before, after, opened, open: onOpen } = images;
    return (
      <div
        ref={images.attach}
        className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2"
      >
        <ImagePanel
          label={t('diff.before')}
          preview={before}
          onOpen={onOpen}
          onError={(url) => images.decodeFailed('before', url)}
        />
        <ImagePanel
          label={t('diff.after')}
          preview={after}
          onOpen={onOpen}
          onError={(url) => images.decodeFailed('after', url)}
        />
        {opened &&
          [before, after].some(
            (preview) =>
              preview.status === 'ready' && preview.url === opened.url,
          ) && (
            <DiffImageViewer
              url={opened.url}
              title={opened.title}
              onClose={images.close}
            />
          )}
      </div>
    );
  },
);
