const activeStatuses = new Set([
  'created',
  'waiting_for_resource',
  'preparing',
  'waiting_for_callback',
  'pending',
  'running',
  'scheduled',
  'canceling',
]);
export const isPipelineActive = (status: string) => activeStatuses.has(status);
