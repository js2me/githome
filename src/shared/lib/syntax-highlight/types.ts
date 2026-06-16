export type DiffFileContentLoader = (
  filePath: string,
  ref: string,
) => Promise<string>;
