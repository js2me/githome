# GitHome

Desktop-клиент для GitLab на базе Electron + React + TypeScript.

## Разработка

В браузере (быстрая итерация по UI):

```bash
pnpm install
pnpm dev
```

Desktop-приложение с Chromium:

```bash
pnpm install
pnpm dev:electron
```

Если Electron не стартует с ошибкой `Electron failed to install correctly`, переустановите бинарник:

```bash
pnpm rebuild electron
```

## Сборка Electron

```bash
pnpm install
pnpm build:electron
```

Артефакты появятся в `release/`:

| Платформа | Форматы |
|---|---|
| Linux | `.deb`, `.AppImage` |
| macOS | `.dmg` |
| Windows | `.exe` (NSIS installer) |

### Требования для локальной сборки

- **Linux / macOS / Windows:** Node.js LTS, pnpm
- **Windows:** Visual Studio Build Tools с **Desktop development with C++**
- **macOS:** Xcode Command Line Tools

Сборка web-only (без Electron):

```bash
pnpm build
```

## CI (GitHub Actions)

Workflow `.github/workflows/electron-build.yml` собирает приложение на `ubuntu-22.04`, `macos-latest` и `windows-latest` и загружает installers. Запускается при push/PR в `main` и вручную через **Actions → Build Electron → Run workflow**.

## IDE

- [VS Code](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
