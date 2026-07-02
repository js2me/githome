import { createRoot } from "react-dom/client";
import { App } from "@/app";
import "@/app/bootstrap/base";
import "@/app/styles.css";
import { syntaxHighlighter } from "@/shared/lib/syntax-highlight/syntax-highlighter";

syntaxHighlighter.preload();

createRoot(document.getElementById("root")!).render(<App />);
