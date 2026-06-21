import { useEffect, useRef } from "react";

export const ProjectsLoadMoreSentinel = ({
  disabled,
  onLoadMore,
}: {
  disabled: boolean;
  onLoadMore: () => void;
}) => {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = sentinelRef.current;

    if (!node || disabled || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: "240px" },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [disabled, onLoadMore]);

  return <div ref={sentinelRef} aria-hidden className="h-px w-full" />;
};
