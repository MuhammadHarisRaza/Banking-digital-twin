import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "@fontsource-variable/source-sans-3";
import "leaflet/dist/leaflet.css";
import "./index.css";
import App from "./App";
import ThemeSync from "./config/ThemeSync";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeSync />
      <App />
    </BrowserRouter>
  </StrictMode>,
);
