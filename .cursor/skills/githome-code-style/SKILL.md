---
name: githome-code-style
description: >-
  Стиль кода githome: не выносить простую одноразовую логику из data class / VM
  в отдельные функции.
---

# Githome: стиль кода

## Простая одноразовая логика — инлайн в data class / VM

**Не выносить** в отдельную функцию/хелпер/утилиту **простое выражение**, которое нужно **только в одном месте** — если оно живёт в **data class или ViewModel**, а не в UI.

- Пиши условие/выражение прямо в `@computed`, геттере, методе VM или data class.
- Отдельная named function оправдана, если логика **переиспользуется в двух и более** несвязанных местах, или если выражение **сложное** и инлайн ухудшает читаемость.
- Не создавай «на будущее» — YAGNI.
- **Слой представления** (React-компоненты, JSX) — отдельно: там допустимо выносить разметку/мелкие UI-куски в подкомпоненты по обычным React-практикам. Это правило про **модель и VM**.

### Эталон

`src/shared/ui/git-diff/model/file-git-diff/meta.ts` — `isLazyCollapsed`: простое условие инлайн в `@computed`, без `isLazyCollapsedMergeRequestChange()` в shared/lib.

### Антипаттерн

```ts
// shared/lib/foo.ts — используется только в одном VM
export const isSomething = (x) => x.a && !x.b;

// some-vm.ts
@computed get filtered() {
  return this.items.filter(isSomething);
}
```

### Правильно

```ts
// some-vm.ts
@computed get filtered() {
  return this.items.filter((item) => item.a && !item.b);
}
```
