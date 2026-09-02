import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { OverlayApp } from "./overlay/OverlayApp";
import { StudioApp } from "./studio/StudioApp";
import "./overlay/mspiky-api";
import "./index.css";

function surfaceFromHash() {
  return window.location.hash.replace(/^#/, "");
}

function Root() {
  const [surface, setSurface] = useState(surfaceFromHash);

  useEffect(() => {
    const sync = () => setSurface(surfaceFromHash());
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle(
      "overlay-surface",
      surface === "overlay",
    );
  }, [surface]);

  return surface === "overlay" ? <OverlayApp /> : <StudioApp />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
