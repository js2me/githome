import { useEffect, useState } from "react";
import type { SyntaxTheme } from "./shiki-highlighter";

const getPreferredSyntaxTheme = (): SyntaxTheme => {
  if (typeof window === "undefined") {
    return "github-light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "github-dark"
    : "github-light";
};

export const useSyntaxTheme = () => {
  const [theme, setTheme] = useState<SyntaxTheme>(getPreferredSyntaxTheme);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      setTheme(getPreferredSyntaxTheme());
    };

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  return theme;
};
