import { cn } from '@/shared/lib/cn';
import {
  getFileTypeIconUrl,
  resolveFileTypeIcon,
} from '@/shared/lib/file-type-icon';

interface FileTypeIconProps {
  path: string;
  folder?: boolean;
  expanded?: boolean;
  className?: string;
}

export function FileTypeIcon({
  path,
  folder,
  expanded,
  className,
}: FileTypeIconProps) {
  const icon = resolveFileTypeIcon(path, folder, expanded);
  const light = getFileTypeIconUrl(`${icon}_light`);
  return (
    <>
      <img
        src={getFileTypeIconUrl(icon)}
        className={cn(className, light && 'hidden dark:block')}
        width={16}
        height={16}
        alt=""
        draggable={false}
      />
      {light && (
        <img
          src={light}
          className={cn(className, 'dark:hidden')}
          width={16}
          height={16}
          alt=""
          draggable={false}
        />
      )}
    </>
  );
}
