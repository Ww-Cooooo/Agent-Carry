import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import Dashboard from "./Dashboard";
import { LocaleRoot } from "./lib/i18n";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LocaleRoot>
      {(locale) => <Dashboard key={locale} />}
    </LocaleRoot>
  </StrictMode>
);
