import { observer } from "mobx-react-lite";
import { useEffect, useRef } from "react";
import type { DiffImagePreview, FileGitDiffImages } from "../model/file-git-diff/images";

const messages = {
  missing: "Файл отсутствует",
  unavailable: "Предпросмотр недоступен",
  loading: "Загрузка изображения…",
  error: "Не удалось загрузить изображение",
};

const ImagePanel = ({
  label,
  preview,
  onError,
}: {
  label: string;
  preview: DiffImagePreview;
  onError: (url: string) => void;
}) => (
  <figure className="min-w-0 overflow-hidden rounded-md border border-[var(--diff-border)]">
    <figcaption className="border-b border-[var(--diff-border)] px-3 py-2 text-sm font-semibold">
      {label}
    </figcaption>
    <div className="flex h-56 items-center justify-center bg-canvas-subtle p-3 sm:h-72">
      {preview.status === "ready" ? (
        <img
          src={preview.url}
          alt={`${label} — ${preview.path}`}
          className="max-h-full max-w-full object-contain"
          decoding="async"
          onError={() => onError(preview.url)}
        />
      ) : (
        <span className="text-center text-sm text-fg-muted">{messages[preview.status]}</span>
      )}
    </div>
  </figure>
);

export const DiffImages = observer(({ images }: { images: FileGitDiffImages }) => {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    if (typeof IntersectionObserver === "undefined") {
      images.show();
      return;
    }

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        visibilityObserver.disconnect();
        images.show();
      }
    }, { rootMargin: "240px 0px" });
    visibilityObserver.observe(container.current);
    return () => visibilityObserver.disconnect();
  }, [images]);

  return (
    <div ref={container} className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2">
      <ImagePanel label="Было" preview={images.before} onError={(url) => images.decodeFailed("before", url)} />
      <ImagePanel label="Стало" preview={images.after} onError={(url) => images.decodeFailed("after", url)} />
    </div>
  );
});
