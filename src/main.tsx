import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Overlay } from "./overlay/Overlay";
import { Studio } from "./studio/Studio";
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

  return surface === "overlay" ? <Overlay /> : <Studio />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
