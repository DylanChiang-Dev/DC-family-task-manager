import { StrictMode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { router } from "@/app/router";
import { useBootstrapAuth } from "@/app/useBootstrapAuth";
import { queryClient } from "@/lib/query-client";
import "./index.css";

function Root() {
  const ready = useBootstrapAuth();

  if (!ready) {
    return <div className="flex min-h-svh items-center justify-center text-muted-foreground">載入中...</div>;
  }

  return <RouterProvider router={router} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Root />
      <Toaster />
    </QueryClientProvider>
  </StrictMode>,
);
