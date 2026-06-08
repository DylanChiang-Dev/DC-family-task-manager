import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

function Placeholder() {
  return <div className="p-4">FTM web bootstrap OK</div>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Placeholder />
  </StrictMode>,
);
