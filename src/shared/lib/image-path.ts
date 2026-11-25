const IMAGE_MIME_TYPES: Partial<Record<string, string>> = {
  apng: 'image/apng',
  avif: 'image/avif',
  bmp: 'image/bmp',
  gif: 'image/gif',
  ico: 'image/x-icon',
  jfif: 'image/jpeg',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  svg: 'image/svg+xml',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  webp: 'image/webp',
};

export const getImageMimeType = (path: string) => {
  const dot = path.lastIndexOf('.');
  const extension = dot >= 0 ? path.slice(dot + 1).toLowerCase() : '';
  return Object.hasOwn(IMAGE_MIME_TYPES, extension)
    ? IMAGE_MIME_TYPES[extension]
    : undefined;
};

export const isImagePath = (path: string) => Boolean(getImageMimeType(path));
