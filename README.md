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

## CI и релизы (GitHub Actions)

Workflow `.github/workflows/release.yml` запускается при каждом push в `main` (и вручную через **Actions → Release → Run workflow**):

1. Собирает **AppImage** и **.deb** на Ubuntu
2. Собирает **.exe** (NSIS) на Windows
3. Создаёт GitHub Release с тегом = **short hash коммита** (7 символов, например `a1b2c3d`)
4. Прикрепляет все installers к релизу

Для создания релизов в репозитории нужны права **Settings → Actions → General → Workflow permissions → Read and write permissions**.

## IDE

- [VS Code](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
