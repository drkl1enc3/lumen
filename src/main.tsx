import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource-variable/inter";
import "./styles.css";
import App from "./App";
import { hydrateStores } from "./store/hydrate";
import { useSettings } from "./store/settings";
import { syncLanguage } from "./i18n";

async function bootstrap() {
  try {
    await hydrateStores();
    syncLanguage(useSettings.getState().language);
  } catch (error) {
    // A broken state file must never prevent the app from opening.
    console.error("Не удалось восстановить сохранённое состояние", error);
  }

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

void bootstrap();
