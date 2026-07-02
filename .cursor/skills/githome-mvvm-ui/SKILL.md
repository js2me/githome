---
name: githome-mvvm-ui
description: >-
  MVVM-паттерн githome (mobx-view-model + VM) для любого кода с бизнес- или
  сложной логикой: страницы, виджеты, фичи, shared UI. Использовать при
  переезде на MVVM, рефакторинге логики из React-хуков, работе с
  withViewModel, withPropsViewModel, ViewModel, reaction, willMount, didUnmount.
---

# Githome: MVVM

**Правило:** бизнес-логика и сложная логика — во ViewModel. React-хуки для этого — зло.

`useState`, `useEffect`, `useCallback`, `useMemo` в view — только если это чисто UI-механика (фокус, ref, портал). Всё остальное — в VM.

## Где применять

- **Страницы** — `src/pages/**/model/`
- **Виджеты** — `src/widgets/**/model/`
- **Фичи** — `src/features/**/model/`
- **Shared UI с логикой** — `src/shared/ui/**/model.ts`

Простые презентационные компоненты без логики могут оставаться plain-компонентами.

## Эталоны

| Масштаб | Путь |
|---------|------|
| Малый UI-компонент | `src/shared/ui/gitlab-avatar/` |
| Виджет | `src/widgets/layout/model/layout-vm.ts` |
| Страница | `src/pages/repository/model/`, `src/pages/repository/pages/merge-requests/pages/[id]/model/` |

## Структура (компонент / фича)

```
feature-or-component/
  model.ts | model/index.ts   — Payload, VM, вся логика
  index.tsx | ui/page.tsx     — тонкий view
```

## VM

- `class XVM extends VM<Payload>` (или `VM<{}, ParentVM>` для вложенных страниц)
- Глобальное состояние — через `this.globals.stores.*`, **не** дублировать в props/payload
- `@observable accessor` — мутабельное; `@computed` — производное
- `@action.bound` — мутации и обработчики
- Payload в VM: `this.payload.*` напрямую. **Не делать геттеры-обёртки** (`get text() { return this.payload.text }`) — только `@computed` / геттеры с реальной логикой (`hasScope`, `cacheKey`)
- View: props для разметки — из `model.payload`, состояние и actions — из `model`
- Побочные эффекты: `reaction()` в `willMount()` или конструкторе с `{ fireImmediately: true }` — **не** `mount()` / `payloadChanged()`
- Асинхронщина: `this.unmountSignal`, захват request-параметров, проверка актуальности после `await` в `runInAction`
- Очистка ресурсов: `didUnmount()`
- DOM-ссылки в VM: `createRef` из `yummies/mobx` (`readonly container = createRef<HTMLElement>()`, в view `ref={container}`)
- Сложную логику выносить в sub-модели (`MrInfoModel`, `ProjectReadmeModel` и т.п.)

## View

Выбор HOC — по удобству:

- **`withPropsViewModel`** (`mobx-view-model`) — компонент принимает props, которые мапятся в VM payload. Примеры: `gitlab-avatar`, `git-diff`, `gitlab-markdown`.
- **`withViewModel`** (`mobx-view-model-react`) — VM без внешних props или с children/контекстом дерева. Примеры: страницы, `layout`, `repository-shell`.

```tsx
// props → payload
export const Component = withPropsViewModel(XVM, ({ model }) => {
  const { /* computed, observable, actions */ } = model;
  const { /* display props */ } = model.payload;
});

// VM в дереве view models
export const Page = withViewModel(PageVM, ({ model }) => {
  const { /* computed, observable, actions */ } = model;
});
```

- View читает состояние из `model`, props для разметки — из `model.payload` (если есть)
- **Не аннотировать** тип колбэка view в `withPropsViewModel` / `withViewModel` — `({ model }) =>` достаточно, тип выводится из VM
- Никакой бизнес-логики, fetch, реакций на данные в хуках
- **Не выносить в отдельный компонент** мелкую разметку, которая: маленькая, почти plain HTML+CSS, используется в одном месте — инлайнить прямо в view (см. fallback в `gitlab-markdown.tsx`)

## Перед рефакторингом

1. Найти ближайший эталон по масштабу (avatar / layout / page)
2. Перенести логику из хуков в VM
3. Убрать дубли props/globals
