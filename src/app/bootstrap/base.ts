import { configure } from "mobx";
import { enableStaticRendering } from "mobx-react-lite";

configure({ enforceActions: "never" });

enableStaticRendering(typeof window === "undefined");
