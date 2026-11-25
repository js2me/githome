import { withPropsViewModel } from 'mobx-view-model-react';
import { LoadMoreSentinelVM } from './model';

export const LoadMoreSentinel = withPropsViewModel(
  LoadMoreSentinelVM,
  ({ model }) => (
    <div ref={model.sentinel} aria-hidden className="h-px w-full" />
  ),
);
