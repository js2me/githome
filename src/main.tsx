import { createRoot } from "react-dom/client";
import { App } from "@/app";
import "@/app/bootstrap/base";
import "@/app/styles.css";
import { preloadSyntaxHighlighter } from "@/shared/lib/syntax-highlight/shiki-highlighter";

preloadSyntaxHighlighter();

createRoot(document.getElementById("root")!).render(<App />);
