import {
  file,
  fileExtensions,
  fileNames,
  folder,
  folderNames,
  iconDefinitions,
} from 'material-icon-theme/dist/material-icons.json';

function nameMap(associations: Record<string, string>) {
  return new Map(
    Object.entries(associations).map(([name, icon]) => [
      name.toLowerCase(),
      icon,
    ]),
  );
}

const files = nameMap(fileNames);
const folders = nameMap(folderNames);
const extensions = nameMap(fileExtensions);
const assets = new Map(
  Object.entries(iconDefinitions).map(([id, { iconPath }]) => [
    id,
    import.meta.env.BASE_URL +
      'file-icons/' +
      iconPath.slice(iconPath.lastIndexOf('/') + 1),
  ]),
);

export function resolveFileTypeIcon(
  path: string,
  isFolder = false,
  expanded = false,
) {
  const normalized = path.toLowerCase();
  const separator = normalized.lastIndexOf('/');
  const name = normalized.slice(separator + 1);
  const names = isFolder ? folders : files;

  // VS Code also supports parent-qualified associations, such as .github/workflows.
  const qualified = normalized.slice(
    normalized.lastIndexOf('/', separator - 1) + 1,
  );
  const namedIcon = names.get(qualified) ?? names.get(name);
  if (isFolder) {
    return (namedIcon ?? folder) + (expanded ? '-open' : '');
  }
  if (namedIcon) return namedIcon;

  // Try stories.tsx and d.ts before the final extension.
  for (
    let dot = name.indexOf('.');
    dot !== -1;
    dot = name.indexOf('.', dot + 1)
  ) {
    const icon = extensions.get(name.slice(dot + 1));
    if (icon) return icon;
  }
  return file;
}

export function getFileTypeIconUrl(id: string) {
  return assets.get(id);
}
