import { bundledLanguages } from "shiki/bundle/web";

type LanguageLoader = () => Promise<{ default: unknown }>;

/**
 * Popular languages outside shiki's web bundle (~80% of code on GitHub).
 * Each loader is a separate chunk loaded on first use.
 */
const EXTENDED_LANGUAGE_LOADERS: Record<string, LanguageLoader> = {
  clojure: () => import("@shikijs/langs/clojure"),
  cmake: () => import("@shikijs/langs/cmake"),
  crystal: () => import("@shikijs/langs/crystal"),
  csharp: () => import("@shikijs/langs/csharp"),
  dart: () => import("@shikijs/langs/dart"),
  docker: () => import("@shikijs/langs/docker"),
  dockerfile: () => import("@shikijs/langs/dockerfile"),
  elixir: () => import("@shikijs/langs/elixir"),
  erlang: () => import("@shikijs/langs/erlang"),
  fsharp: () => import("@shikijs/langs/fsharp"),
  gdscript: () => import("@shikijs/langs/gdscript"),
  go: () => import("@shikijs/langs/go"),
  groovy: () => import("@shikijs/langs/groovy"),
  haskell: () => import("@shikijs/langs/haskell"),
  hcl: () => import("@shikijs/langs/hcl"),
  ini: () => import("@shikijs/langs/ini"),
  kotlin: () => import("@shikijs/langs/kotlin"),
  lua: () => import("@shikijs/langs/lua"),
  makefile: () => import("@shikijs/langs/makefile"),
  matlab: () => import("@shikijs/langs/matlab"),
  nginx: () => import("@shikijs/langs/nginx"),
  nim: () => import("@shikijs/langs/nim"),
  nix: () => import("@shikijs/langs/nix"),
  "objective-c": () => import("@shikijs/langs/objective-c"),
  ocaml: () => import("@shikijs/langs/ocaml"),
  perl: () => import("@shikijs/langs/perl"),
  powershell: () => import("@shikijs/langs/powershell"),
  proto: () => import("@shikijs/langs/proto"),
  protobuf: () => import("@shikijs/langs/protobuf"),
  raku: () => import("@shikijs/langs/raku"),
  ruby: () => import("@shikijs/langs/ruby"),
  rust: () => import("@shikijs/langs/rust"),
  scala: () => import("@shikijs/langs/scala"),
  solidity: () => import("@shikijs/langs/solidity"),
  swift: () => import("@shikijs/langs/swift"),
  terraform: () => import("@shikijs/langs/terraform"),
  toml: () => import("@shikijs/langs/toml"),
  vb: () => import("@shikijs/langs/vb"),
  zig: () => import("@shikijs/langs/zig"),
};

const loadedLanguages = new Set<string>();

export const getLanguageLoader = (lang: string): LanguageLoader | null => {
  if (lang in bundledLanguages) {
    return bundledLanguages[lang as keyof typeof bundledLanguages];
  }

  return EXTENDED_LANGUAGE_LOADERS[lang] ?? null;
};

export const isSupportedSyntaxLanguage = (lang: string): boolean =>
  getLanguageLoader(lang) !== null;

export const loadSyntaxLanguage = async (
  lang: string,
  loadLanguage: (registration: Awaited<ReturnType<LanguageLoader>>) => void,
): Promise<boolean> => {
  if (loadedLanguages.has(lang)) {
    return true;
  }

  const loader = getLanguageLoader(lang);
  if (!loader) {
    return false;
  }

  const registration = await loader();
  loadLanguage(registration);
  loadedLanguages.add(lang);

  return true;
};
