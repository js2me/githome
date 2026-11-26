import { queryClient } from 'mobx-tanstack-query/preset';

export const handleRefreshShortcut = (event: KeyboardEvent) => {
  if (
    !(event.ctrlKey || event.metaKey) ||
    event.code !== 'KeyR' ||
    event.altKey ||
    event.shiftKey ||
    event.isComposing ||
    event.defaultPrevented
  ) {
    return;
  }

  event.preventDefault();
  if (!event.repeat) {
    void queryClient.refetchQueries(
      { type: 'active' },
      { cancelRefetch: false },
    );
  }
};
