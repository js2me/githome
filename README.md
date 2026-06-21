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

### Установка `.deb` на Ubuntu

Пакет называется `git-home` (как у старой Tauri-сборки) — обновление через apt/dpkg должно проходить без конфликтов.

Если раньше ставили `.deb` из раннего Electron-релиза с именем `githome`, удалите оба пакета и поставьте заново:

```bash
sudo apt remove git-home githome
sudo dpkg -i git-home_*.deb
sudo apt -f install
```

Или используйте `.AppImage` — он не конфликтует с системными пакетами.

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

1. **build-app** (один раз на Ubuntu) — `tsc` + Vite: `dist/` и `dist-electron/`
2. **package** (matrix) — скачивает bundle и собирает installers:
   - Ubuntu → `.AppImage`, `.deb`
   - Windows → `.exe`
3. **release** — GitHub Release с тегом = **short hash коммита** (7 символов)

Для создания релизов в репозитории нужны права **Settings → Actions → General → Workflow permissions → Read and write permissions**.

## IDE

- [VS Code](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
