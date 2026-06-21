export const formatProjectCount = (
  count: number | null | undefined,
): string | null => {
  if (count == null) {
    return null;
  }

  if (count < 1000) {
    return String(count);
  }

  const thousands = count / 1000;
  const rounded =
    thousands >= 10
      ? Math.round(thousands)
      : Math.round(thousands * 10) / 10;

  return `${String(rounded).replace(/\.0$/, "")}k`;
};
