export const getDiffLineTokenKey = (line: {
  type: string;
  oldLine: number | null;
  newLine: number | null;
}) => {
  if (line.type === "delete") {
    return `old:${line.oldLine}`;
  }

  return `new:${line.newLine ?? line.oldLine}`;
};
