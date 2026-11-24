import { MagnifierPlus } from "@gravity-ui/icons";
import { observer } from "mobx-react-lite";
import { useEffect, useRef, useState } from "react";
import type { DiffImagePreview, FileGitDiffImages } from "../model/file-git-diff/images";
import { DiffImageViewer } from "./diff-image-viewer";

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
  onOpen,
}: {
  label: string;
  preview: DiffImagePreview;
  onError: (url: string) => void;
  onOpen: (url: string, title: string) => void;
}) => (
  <figure className="min-w-0 overflow-hidden rounded-md border border-[var(--diff-border)]">
    <figcaption className="border-b border-[var(--diff-border)] px-3 py-2 text-sm font-semibold">
      {label}
    </figcaption>
    <div className="flex h-56 items-center justify-center bg-canvas-subtle p-3 sm:h-72">
      {preview.status === "ready" ? (
        <button
          type="button"
          aria-haspopup="dialog"
          aria-label={`Открыть изображение «${label}»`}
          title="Открыть изображение"
          className="relative flex size-full cursor-zoom-in items-center justify-center rounded-sm focus-visible:outline-2 focus-visible:outline-accent-blue"
          onClick={() => onOpen(preview.url, `${label} — ${preview.path}`)}
        >
          <img
            src={preview.url}
            alt={`${label} — ${preview.path}`}
            className="max-h-full max-w-full object-contain"
            decoding="async"
            onError={() => onError(preview.url)}
          />
          <span className="absolute right-1 bottom-1 rounded-md border border-border-default bg-canvas-overlay p-1.5 text-fg-default" aria-hidden>
            <MagnifierPlus className="size-4" />
          </span>
        </button>
      ) : (
        <span className="text-center text-sm text-fg-muted">{messages[preview.status]}</span>
      )}
    </div>
  </figure>
);

export const DiffImages = observer(({ images }: { images: FileGitDiffImages }) => {
  const container = useRef<HTMLDivElement>(null);
  const [opened, setOpened] = useState<{ url: string; title: string } | null>(null);
  const onOpen = (url: string, title: string) => setOpened({ url, title });
  const { before, after } = images;

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
      <ImagePanel label="Было" preview={before} onOpen={onOpen} onError={(url) => images.decodeFailed("before", url)} />
      <ImagePanel label="Стало" preview={after} onOpen={onOpen} onError={(url) => images.decodeFailed("after", url)} />
      {opened && [before, after].some(preview => preview.status === "ready" && preview.url === opened.url) && (
        <DiffImageViewer url={opened.url} title={opened.title} onClose={() => setOpened(null)} />
      )}
    </div>
  );
});
