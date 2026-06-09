# Web 前端 Phase 2：基礎 + 認證 + 任務 CRUD 垂直切片 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 `apps/web` React SPA 的地基，打通「註冊 → 登入 → 切換團隊 → 建立/編輯/刪除任務 → 看列表」這條端到端垂直切片。

**Architecture:** Vite + React 18 + TypeScript SPA，部署到 Cloudflare Pages。服務端狀態用 TanStack Query（含 `teamId` 於 queryKey 做團隊隔離），客戶端全域狀態用 Zustand（accessToken 存記憶體、currentTeamId 持久化），表單用 React Hook Form + `@ftm/shared` 的 Zod schema。API 透過統一 `request()` 客戶端呼叫，401 時自動以 httpOnly cookie 走 `/auth/refresh` 換新 accessToken 後重放原請求。

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS v4 (`@tailwindcss/vite`), shadcn/ui (new-york), TanStack Query v5, Zustand v5, React Router v6, React Hook Form + @hookform/resolvers, Vitest + React Testing Library + MSW v2。

---

## 計劃集結構（本份是第 1 份）

整個前端依 `specs/rebuild/06-frontend.md` 的階段拆成多份計劃，每份產出可運行的軟體：

| 計劃 | 範圍 | 狀態 |
|------|------|------|
| **Phase 2（本份）** | 腳手架 + 認證（cookie refresh）+ 團隊切換 + 任務 CRUD | 已完成 |
| Phase 3 | 分類管理、任務評論、通知中心 + 紅點、任務歷史 | 已完成（見 `2026-06-09-web-completion.md`） |
| Phase 4 | 日曆月視圖、週期任務虛擬實例展開、農曆模組（JS→TS） | 已完成（見 `2026-06-09-web-completion.md`） |
| Phase 6 | PWA（manifest + SW + 離線讀）、暗色模式、行動端導航、打磨 | 已完成（見 `2026-06-09-web-completion.md`） |

> Phase 5（定時任務/郵件）後端已完成，前端只需在 Phase 3 的通知中心呈現 `due_reminder` 通知，不另立計劃。

後端契約（已部署且驗證）：
- Base URL：dev `http://localhost:8787/api`，prod `https://ftm-api.dylan-chiang.workers.dev/api`
- 統一封套：成功 `{ success: true, data: T }`；失敗 `{ success: false, error: { code, message, details? } }`
- 認證：受保護端點需 `Authorization: Bearer <accessToken>`；團隊上下文走 `X-Team-Id` header
- refresh token 為 httpOnly cookie（path `/api/auth`），`/auth/login`、`/auth/register`、`/auth/refresh` 會 `Set-Cookie`；`/auth/refresh`、`/auth/logout` 從 cookie 讀取，**body 不含 refreshToken**
- 所有型別與 Zod schema 來自 `@ftm/shared`

---

## 檔案結構（Phase 2 建立/修改）

```
apps/web/
├── package.json                      # 套件與 scripts
├── index.html                        # SPA 入口
├── vite.config.ts                    # Vite + tailwind + react + alias + vitest 設定
├── tsconfig.json                     # 專案參考根
├── tsconfig.app.json                 # app 編譯設定（含 @/* 與 @ftm/shared alias）
├── tsconfig.node.json                # vite.config 用
├── components.json                   # shadcn 設定（init 產生）
├── .env.development                  # VITE_API_BASE_URL=http://localhost:8787/api
├── .env.production                   # VITE_API_BASE_URL=https://ftm-api.dylan-chiang.workers.dev/api
└── src/
    ├── main.tsx                      # React 掛載 + Providers
    ├── index.css                     # @import "tailwindcss" + shadcn 變數
    ├── vite-env.d.ts                 # import.meta.env 型別
    ├── lib/
    │   ├── utils.ts                  # shadcn cn()（init 產生）
    │   ├── api-client.ts             # request<T>() + ApiError + refresh-on-401
    │   └── query-client.ts           # QueryClient 實例
    ├── stores/
    │   └── auth-store.ts             # Zustand：accessToken(記憶體)/user/currentTeamId(持久化)
    ├── components/
    │   ├── ui/                       # shadcn 元件（CLI 產生）
    │   ├── ProtectedRoute.tsx        # 路由守衛
    │   └── AppLayout.tsx             # 登入後外殼（含 TeamSwitcher、導航、登出）
    ├── app/
    │   ├── router.tsx                # React Router 路由表
    │   └── useBootstrapAuth.ts       # 啟動時以 cookie refresh 重建登入態
    ├── features/
    │   ├── auth/
    │   │   ├── api.ts                # login/register/logout/fetchMe
    │   │   ├── hooks.ts              # useLogin/useRegister/useLogout
    │   │   ├── LoginPage.tsx
    │   │   └── RegisterPage.tsx
    │   ├── teams/
    │   │   ├── api.ts                # fetchTeams/switchTeam
    │   │   ├── hooks.ts              # useTeams/useSwitchTeam
    │   │   └── TeamSwitcher.tsx
    │   └── tasks/
    │       ├── api.ts                # fetch/create/update/delete tasks
    │       ├── hooks.ts              # useTasks/useCreateTask/useUpdateTask/useDeleteTask
    │       ├── TaskListPage.tsx      # 列表頁（狀態篩選）
    │       ├── TaskCard.tsx          # 單張卡片 + 快速改狀態
    │       └── TaskFormDialog.tsx    # 建立/編輯表單（RHF + zod）
    └── test/
        ├── setup.ts                  # RTL + jest-dom + MSW 生命週期
        ├── msw-server.ts             # MSW node server
        └── test-utils.tsx            # render with Providers helper
```

---

### Task 1: 建立 Vite 腳手架與 workspace 接線

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/index.html`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/tsconfig.json`, `apps/web/tsconfig.app.json`, `apps/web/tsconfig.node.json`
- Create: `apps/web/src/main.tsx`, `apps/web/src/index.css`, `apps/web/src/vite-env.d.ts`
- Create: `apps/web/.env.development`, `apps/web/.env.production`

- [x] **Step 1: 建立 package.json**

`apps/web/package.json`：
```json
{
  "name": "@ftm/web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc -b --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@ftm/shared": "workspace:*",
    "@hookform/resolvers": "^3.9.1",
    "@tanstack/react-query": "^5.62.7",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.54.2",
    "react-router-dom": "^6.28.0",
    "zod": "^3.24.1",
    "zustand": "^5.0.2"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.0.0",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/node": "^22.10.2",
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "@vitejs/plugin-react": "^4.3.4",
    "jsdom": "^25.0.1",
    "msw": "^2.7.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.3",
    "vite": "^6.0.5",
    "vitest": "^2.1.8"
  }
}
```

- [x] **Step 2: 建立 index.html**

`apps/web/index.html`：
```html
<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>家庭任務管理</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [x] **Step 3: 建立 tsconfig 三件組**

`apps/web/tsconfig.json`：
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

`apps/web/tsconfig.app.json`：
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "noEmit": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "types": ["vite/client", "@testing-library/jest-dom"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@ftm/shared": ["../../packages/shared/src/index.ts"]
    }
  },
  "include": ["src"]
}
```

`apps/web/tsconfig.node.json`：
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "noEmit": true,
    "lib": ["ES2022"],
    "types": ["node"]
  },
  "include": ["vite.config.ts"]
}
```

- [x] **Step 4: 建立 vite.config.ts（含 Vitest 設定）**

`apps/web/vite.config.ts`：
```ts
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@ftm/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
    },
  },
  server: {
    port: 5173,
    fs: { allow: [path.resolve(__dirname, "../..")] },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
```

- [x] **Step 5: 建立進入點與環境檔**

`apps/web/src/index.css`：
```css
@import "tailwindcss";
```

`apps/web/src/vite-env.d.ts`：
```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

`apps/web/src/main.tsx`：
```tsx
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
```

`apps/web/.env.development`：
```
VITE_API_BASE_URL=http://localhost:8787/api
```

`apps/web/.env.production`：
```
VITE_API_BASE_URL=https://ftm-api.dylan-chiang.workers.dev/api
```

- [x] **Step 6: 安裝依賴**

Run: `cd /Users/dc/Documents/DylanChiang-Dev/DC-family-task-manager && pnpm install`
Expected: 安裝完成，`apps/web/node_modules` 建立，`@ftm/shared` 以 workspace symlink 連結。

- [x] **Step 7: 驗證 dev server 啟動**

Run: `pnpm --filter @ftm/web dev` （啟動後手動開 http://localhost:5173 應顯示 "FTM web bootstrap OK"，確認後 Ctrl-C）
Expected: Vite 正常啟動於 5173，無編譯錯誤。

- [x] **Step 8: Commit**

```bash
git add apps/web pnpm-lock.yaml
git commit -m "feat(web): scaffold Vite + React + TS app with workspace wiring"
```

---

### Task 2: 初始化 Tailwind v4 + shadcn/ui

**Files:**
- Create: `apps/web/components.json`（CLI 產生）
- Create: `apps/web/src/lib/utils.ts`（CLI 產生）
- Create: `apps/web/src/components/ui/*`（CLI 產生）
- Modify: `apps/web/src/index.css`（shadcn 注入主題變數）

- [x] **Step 1: 執行 shadcn init**

Run: `cd apps/web && pnpm dlx shadcn@latest init`
互動選項：style = `new-york`、base color = `slate`、CSS variables = yes。
Expected: 產生 `components.json`、`src/lib/utils.ts`，並改寫 `src/index.css` 注入 `@theme` 變數與 `tw-animate-css`。

- [x] **Step 2: 加入本階段需要的元件**

Run:
```bash
cd apps/web && pnpm dlx shadcn@latest add button input label card dialog select textarea badge dropdown-menu sonner form
```
Expected: `src/components/ui/` 出現對應元件檔；`sonner`（toast）安裝。

- [x] **Step 3: 驗證 typecheck**

Run: `pnpm --filter @ftm/web typecheck`
Expected: 無錯誤（shadcn 元件依賴 `@/lib/utils` 的 `cn` 已就緒）。

- [x] **Step 4: Commit**

```bash
git add apps/web
git commit -m "feat(web): init Tailwind v4 + shadcn/ui with base components"
```

---

### Task 3: 建立測試基礎設施（Vitest + RTL + MSW）

**Files:**
- Create: `apps/web/src/test/setup.ts`
- Create: `apps/web/src/test/msw-server.ts`
- Create: `apps/web/src/test/test-utils.tsx`
- Create: `apps/web/src/lib/query-client.ts`
- Test: `apps/web/src/test/smoke.test.tsx`

- [x] **Step 1: 建立 MSW server 與測試 setup**

`apps/web/src/test/msw-server.ts`：
```ts
import { setupServer } from "msw/node";

export const server = setupServer();
```

`apps/web/src/test/setup.ts`：
```ts
import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { cleanup } from "@testing-library/react";
import { server } from "./msw-server";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());
```

- [x] **Step 2: 建立 QueryClient 與 render helper**

`apps/web/src/lib/query-client.ts`：
```ts
import { QueryClient } from "@tanstack/react-query";

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 30_000, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
}

export const queryClient = createQueryClient();
```

`apps/web/src/test/test-utils.tsx`：
```tsx
import type { ReactElement, ReactNode } from "react";
import { render } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { createQueryClient } from "@/lib/query-client";

export function renderWithProviders(
  ui: ReactElement,
  { route = "/" }: { route?: string } = {},
) {
  const qc = createQueryClient();
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  }
  return render(ui, { wrapper: Wrapper });
}

export * from "@testing-library/react";
```

- [x] **Step 3: 寫 smoke 測試**

`apps/web/src/test/smoke.test.tsx`：
```tsx
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";

describe("test infra", () => {
  it("renders a component through providers", () => {
    renderWithProviders(<div>hello-test</div>);
    expect(screen.getByText("hello-test")).toBeInTheDocument();
  });
});
```

- [x] **Step 4: 執行測試**

Run: `pnpm --filter @ftm/web test`
Expected: 1 passed。

- [x] **Step 5: Commit**

```bash
git add apps/web
git commit -m "test(web): set up Vitest + RTL + MSW infra"
```

---

### Task 4: Auth store（Zustand）

**Files:**
- Create: `apps/web/src/stores/auth-store.ts`
- Test: `apps/web/src/stores/auth-store.test.ts`

- [x] **Step 1: 寫失敗測試**

`apps/web/src/stores/auth-store.test.ts`：
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "./auth-store";

const reset = () =>
  useAuthStore.setState({ accessToken: null, user: null, currentTeamId: null, isBootstrapped: false });

describe("auth-store", () => {
  beforeEach(reset);

  it("setAuth stores token, user and team", () => {
    useAuthStore.getState().setAuth({
      accessToken: "tok",
      user: { id: 1, username: "a", nickname: "A", email: null, currentTeamId: 5, createdAt: 0 },
      currentTeamId: 5,
    });
    const s = useAuthStore.getState();
    expect(s.accessToken).toBe("tok");
    expect(s.user?.id).toBe(1);
    expect(s.currentTeamId).toBe(5);
  });

  it("setAccessToken updates only the token", () => {
    useAuthStore.getState().setAccessToken("new");
    expect(useAuthStore.getState().accessToken).toBe("new");
  });

  it("clearAuth wipes token and user but keeps currentTeamId", () => {
    useAuthStore.getState().setAuth({
      accessToken: "tok",
      user: { id: 1, username: "a", nickname: "A", email: null, currentTeamId: 5, createdAt: 0 },
      currentTeamId: 5,
    });
    useAuthStore.getState().clearAuth();
    const s = useAuthStore.getState();
    expect(s.accessToken).toBeNull();
    expect(s.user).toBeNull();
    expect(s.currentTeamId).toBe(5);
  });
});
```

- [x] **Step 2: 執行測試確認失敗**

Run: `pnpm --filter @ftm/web test -- auth-store`
Expected: FAIL（找不到 `./auth-store`）。

- [x] **Step 3: 實作 store**

`apps/web/src/stores/auth-store.ts`：
```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "@ftm/shared";

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  currentTeamId: number | null;
  isBootstrapped: boolean;
  setAccessToken: (token: string) => void;
  setAuth: (p: { accessToken: string; user: AuthUser; currentTeamId: number | null }) => void;
  setCurrentTeamId: (id: number) => void;
  setBootstrapped: (v: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      currentTeamId: null,
      isBootstrapped: false,
      setAccessToken: (token) => set({ accessToken: token }),
      setAuth: ({ accessToken, user, currentTeamId }) =>
        set({ accessToken, user, currentTeamId }),
      setCurrentTeamId: (id) => set({ currentTeamId: id }),
      setBootstrapped: (v) => set({ isBootstrapped: v }),
      clearAuth: () => set({ accessToken: null, user: null }),
    }),
    {
      name: "ftm-auth",
      // accessToken 只留記憶體；只持久化使用者的團隊選擇
      partialize: (s) => ({ currentTeamId: s.currentTeamId }),
    },
  ),
);
```

- [x] **Step 4: 執行測試確認通過**

Run: `pnpm --filter @ftm/web test -- auth-store`
Expected: 3 passed。

- [x] **Step 5: Commit**

```bash
git add apps/web/src/stores
git commit -m "feat(web): add Zustand auth store (memory token + persisted team)"
```

---

### Task 5: API 客戶端（request + 401 自動 refresh）

**Files:**
- Create: `apps/web/src/lib/api-client.ts`
- Test: `apps/web/src/lib/api-client.test.ts`

- [x] **Step 1: 寫失敗測試（MSW 模擬 401→refresh→重放）**

`apps/web/src/lib/api-client.test.ts`：
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw-server";
import { request, ApiError } from "./api-client";
import { useAuthStore } from "@/stores/auth-store";

const BASE = "http://localhost:8787/api";

beforeEach(() => {
  useAuthStore.setState({ accessToken: "old", user: null, currentTeamId: 7, isBootstrapped: true });
});

describe("api-client", () => {
  it("returns data on success and sends auth + team headers", async () => {
    let seenAuth = "";
    let seenTeam = "";
    server.use(
      http.get(`${BASE}/tasks`, ({ request: req }) => {
        seenAuth = req.headers.get("Authorization") ?? "";
        seenTeam = req.headers.get("X-Team-Id") ?? "";
        return HttpResponse.json({ success: true, data: [{ id: 1 }] });
      }),
    );
    const data = await request<{ id: number }[]>("/tasks");
    expect(data).toEqual([{ id: 1 }]);
    expect(seenAuth).toBe("Bearer old");
    expect(seenTeam).toBe("7");
  });

  it("on 401 refreshes then replays with the new token", async () => {
    let calls = 0;
    server.use(
      http.get(`${BASE}/tasks`, ({ request: req }) => {
        calls += 1;
        if (req.headers.get("Authorization") === "Bearer old") {
          return HttpResponse.json(
            { success: false, error: { code: "UNAUTHORIZED", message: "expired" } },
            { status: 401 },
          );
        }
        return HttpResponse.json({ success: true, data: "ok" });
      }),
      http.post(`${BASE}/auth/refresh`, () => {
        useAuthStore.setState({ accessToken: "fresh" });
        return HttpResponse.json({ success: true, data: { accessToken: "fresh" } });
      }),
    );
    const data = await request<string>("/tasks");
    expect(data).toBe("ok");
    expect(calls).toBe(2);
    expect(useAuthStore.getState().accessToken).toBe("fresh");
  });

  it("on 401 with failed refresh clears auth and throws", async () => {
    server.use(
      http.get(`${BASE}/tasks`, () =>
        HttpResponse.json(
          { success: false, error: { code: "UNAUTHORIZED", message: "expired" } },
          { status: 401 },
        ),
      ),
      http.post(`${BASE}/auth/refresh`, () =>
        HttpResponse.json(
          { success: false, error: { code: "UNAUTHORIZED", message: "revoked" } },
          { status: 401 },
        ),
      ),
    );
    await expect(request("/tasks")).rejects.toBeInstanceOf(ApiError);
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it("throws ApiError with code on business failure", async () => {
    server.use(
      http.post(`${BASE}/tasks`, () =>
        HttpResponse.json(
          { success: false, error: { code: "VALIDATION_ERROR", message: "bad" } },
          { status: 400 },
        ),
      ),
    );
    await expect(request("/tasks", { method: "POST", body: {} })).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 400,
    });
  });
});
```

- [x] **Step 2: 執行測試確認失敗**

Run: `pnpm --filter @ftm/web test -- api-client`
Expected: FAIL（找不到 `./api-client`）。

- [x] **Step 3: 實作 api-client**

`apps/web/src/lib/api-client.ts`：
```ts
import type { ApiResponse } from "@ftm/shared";
import { useAuthStore } from "@/stores/auth-store";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  skipAuthRefresh?: boolean;
}

let refreshPromise: Promise<boolean> | null = null;

async function attemptRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) return false;
        const json = (await res.json()) as ApiResponse<{ accessToken: string }>;
        if (!json.success) return false;
        useAuthStore.getState().setAccessToken(json.data.accessToken);
        return true;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, skipAuthRefresh, headers, ...rest } = options;

  const doFetch = () => {
    const s = useAuthStore.getState();
    return fetch(`${API_BASE}${path}`, {
      ...rest,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(s.accessToken ? { Authorization: `Bearer ${s.accessToken}` } : {}),
        ...(s.currentTeamId ? { "X-Team-Id": String(s.currentTeamId) } : {}),
        ...headers,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  };

  let res = await doFetch();

  if (res.status === 401 && !skipAuthRefresh) {
    const ok = await attemptRefresh();
    if (ok) {
      res = await doFetch();
    } else {
      useAuthStore.getState().clearAuth();
      throw new ApiError(401, "UNAUTHORIZED", "Session expired");
    }
  }

  const json = (await res.json()) as ApiResponse<T>;
  if (!json.success) {
    throw new ApiError(res.status, json.error.code, json.error.message, json.error.details);
  }
  return json.data;
}
```

- [x] **Step 4: 執行測試確認通過**

Run: `pnpm --filter @ftm/web test -- api-client`
Expected: 4 passed。

- [x] **Step 5: Commit**

```bash
git add apps/web/src/lib/api-client.ts apps/web/src/lib/api-client.test.ts
git commit -m "feat(web): add API client with cookie-based 401 refresh + replay"
```

---

### Task 6: Auth API 與 hooks

**Files:**
- Create: `apps/web/src/features/auth/api.ts`
- Create: `apps/web/src/features/auth/hooks.ts`
- Test: `apps/web/src/features/auth/api.test.ts`

- [x] **Step 1: 寫失敗測試**

`apps/web/src/features/auth/api.test.ts`：
```ts
import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw-server";
import { login, fetchMe } from "./api";

const BASE = "http://localhost:8787/api";

describe("auth api", () => {
  it("login returns user + accessToken (no refreshToken in body)", async () => {
    server.use(
      http.post(`${BASE}/auth/login`, async ({ request: req }) => {
        const body = (await req.json()) as { username: string };
        expect(body.username).toBe("alice");
        return HttpResponse.json({
          success: true,
          data: {
            user: { id: 1, username: "alice", nickname: "A", email: null, currentTeamId: 5, createdAt: 0 },
            team: { id: 5, name: "T", inviteCode: "X", role: "admin" },
            accessToken: "tok",
          },
        });
      }),
    );
    const res = await login({ username: "alice", password: "secret" });
    expect(res.accessToken).toBe("tok");
    expect(res.user.id).toBe(1);
  });

  it("fetchMe returns teams + currentTeam", async () => {
    server.use(
      http.get(`${BASE}/auth/me`, () =>
        HttpResponse.json({
          success: true,
          data: {
            user: { id: 1, username: "alice", nickname: "A", email: null, currentTeamId: 5, createdAt: 0 },
            teams: [{ id: 5, name: "T", inviteCode: "X", role: "admin" }],
            currentTeam: { id: 5, name: "T", inviteCode: "X", role: "admin" },
          },
        }),
      ),
    );
    const me = await fetchMe();
    expect(me.teams).toHaveLength(1);
    expect(me.currentTeam?.id).toBe(5);
  });
});
```

- [x] **Step 2: 執行測試確認失敗**

Run: `pnpm --filter @ftm/web test -- auth/api`
Expected: FAIL（找不到 `./api`）。

- [x] **Step 3: 實作 auth api**

`apps/web/src/features/auth/api.ts`：
```ts
import type {
  LoginInput,
  RegisterInput,
  LoginResponse,
  RegisterResponse,
  MeResponse,
} from "@ftm/shared";
import { request } from "@/lib/api-client";

export function login(input: LoginInput) {
  return request<LoginResponse>("/auth/login", { method: "POST", body: input, skipAuthRefresh: true });
}

export function register(input: RegisterInput) {
  return request<RegisterResponse>("/auth/register", { method: "POST", body: input, skipAuthRefresh: true });
}

export function logout() {
  return request<{ message: string }>("/auth/logout", { method: "POST", skipAuthRefresh: true });
}

export function fetchMe() {
  return request<MeResponse>("/auth/me");
}
```

- [x] **Step 4: 實作 auth hooks**

`apps/web/src/features/auth/hooks.ts`：
```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { login, register, logout } from "./api";
import { useAuthStore } from "@/stores/auth-store";

export function useLogin() {
  return useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      useAuthStore.getState().setAuth({
        accessToken: data.accessToken,
        user: data.user,
        currentTeamId: data.team?.id ?? data.user.currentTeamId,
      });
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: register,
    onSuccess: (data) => {
      useAuthStore.getState().setAuth({
        accessToken: data.accessToken,
        user: data.user,
        currentTeamId: data.team.id,
      });
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      useAuthStore.getState().clearAuth();
      qc.clear();
    },
  });
}
```

- [x] **Step 5: 執行測試確認通過**

Run: `pnpm --filter @ftm/web test -- auth/api`
Expected: 2 passed。

- [x] **Step 6: Commit**

```bash
git add apps/web/src/features/auth
git commit -m "feat(web): add auth api functions and react-query hooks"
```

---

### Task 7: 登入頁（RHF + zod + shadcn form）

**Files:**
- Create: `apps/web/src/features/auth/LoginPage.tsx`
- Test: `apps/web/src/features/auth/LoginPage.test.tsx`

- [x] **Step 1: 寫失敗測試**

`apps/web/src/features/auth/LoginPage.test.tsx`：
```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { server } from "@/test/msw-server";
import { renderWithProviders } from "@/test/test-utils";
import { useAuthStore } from "@/stores/auth-store";
import { LoginPage } from "./LoginPage";

const BASE = "http://localhost:8787/api";

beforeEach(() => {
  useAuthStore.setState({ accessToken: null, user: null, currentTeamId: null, isBootstrapped: true });
});

describe("LoginPage", () => {
  it("submits credentials and stores auth on success", async () => {
    server.use(
      http.post(`${BASE}/auth/login`, () =>
        HttpResponse.json({
          success: true,
          data: {
            user: { id: 1, username: "alice", nickname: "A", email: null, currentTeamId: 5, createdAt: 0 },
            team: { id: 5, name: "T", inviteCode: "X", role: "admin" },
            accessToken: "tok",
          },
        }),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);
    await user.type(screen.getByLabelText("用戶名"), "alice");
    await user.type(screen.getByLabelText("密碼"), "secret1");
    await user.click(screen.getByRole("button", { name: "登入" }));
    await waitFor(() => expect(useAuthStore.getState().accessToken).toBe("tok"));
  });

  it("shows server error message on 401", async () => {
    server.use(
      http.post(`${BASE}/auth/login`, () =>
        HttpResponse.json(
          { success: false, error: { code: "UNAUTHORIZED", message: "用戶名或密碼錯誤" } },
          { status: 401 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);
    await user.type(screen.getByLabelText("用戶名"), "alice");
    await user.type(screen.getByLabelText("密碼"), "secret1");
    await user.click(screen.getByRole("button", { name: "登入" }));
    expect(await screen.findByText("用戶名或密碼錯誤")).toBeInTheDocument();
  });
});
```

- [x] **Step 2: 執行測試確認失敗**

Run: `pnpm --filter @ftm/web test -- LoginPage`
Expected: FAIL（找不到 `./LoginPage`）。

- [x] **Step 3: 實作 LoginPage**

`apps/web/src/features/auth/LoginPage.tsx`：
```tsx
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, Link } from "react-router-dom";
import { loginSchema, type LoginInput } from "@ftm/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ApiError } from "@/lib/api-client";
import { useLogin } from "./hooks";

export function LoginPage() {
  const navigate = useNavigate();
  const loginMutation = useLogin();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginInput) => {
    setServerError(null);
    try {
      await loginMutation.mutateAsync(values);
      navigate("/", { replace: true });
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "登入失敗，請稍後再試");
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm p-6">
        <h1 className="mb-6 text-xl font-semibold">登入</h1>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="username">用戶名</Label>
            <Input id="username" autoComplete="username" {...register("username")} />
            {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">密碼</Label>
            <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "登入中…" : "登入"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          還沒有帳號？<Link to="/register" className="underline">註冊</Link>
        </p>
      </Card>
    </div>
  );
}
```

- [x] **Step 4: 執行測試確認通過**

Run: `pnpm --filter @ftm/web test -- LoginPage`
Expected: 2 passed。

- [x] **Step 5: Commit**

```bash
git add apps/web/src/features/auth/LoginPage.tsx apps/web/src/features/auth/LoginPage.test.tsx
git commit -m "feat(web): add login page with RHF + zod validation"
```

---

### Task 8: 註冊頁（含 create/join 團隊分支）

**Files:**
- Create: `apps/web/src/features/auth/RegisterPage.tsx`
- Test: `apps/web/src/features/auth/RegisterPage.test.tsx`

- [x] **Step 1: 寫失敗測試**

`apps/web/src/features/auth/RegisterPage.test.tsx`：
```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { server } from "@/test/msw-server";
import { renderWithProviders } from "@/test/test-utils";
import { useAuthStore } from "@/stores/auth-store";
import { RegisterPage } from "./RegisterPage";

const BASE = "http://localhost:8787/api";

beforeEach(() => {
  useAuthStore.setState({ accessToken: null, user: null, currentTeamId: null, isBootstrapped: true });
});

describe("RegisterPage", () => {
  it("registers in create mode and stores auth", async () => {
    server.use(
      http.post(`${BASE}/auth/register`, async ({ request: req }) => {
        const body = (await req.json()) as { teamOption: string };
        expect(body.teamOption).toBe("create");
        return HttpResponse.json(
          {
            success: true,
            data: {
              user: { id: 1, username: "bob", nickname: "B", email: null, currentTeamId: 9, createdAt: 0 },
              team: { id: 9, name: "B的團隊", inviteCode: "ABC123", role: "admin" },
              accessToken: "tok2",
            },
          },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);
    await user.type(screen.getByLabelText("用戶名"), "bob");
    await user.type(screen.getByLabelText("暱稱"), "Bob");
    await user.type(screen.getByLabelText("密碼"), "secret1");
    await user.click(screen.getByRole("button", { name: "註冊" }));
    await waitFor(() => expect(useAuthStore.getState().accessToken).toBe("tok2"));
  });

  it("requires invite code when joining", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);
    await user.click(screen.getByRole("radio", { name: "加入團隊" }));
    await user.type(screen.getByLabelText("用戶名"), "bob");
    await user.type(screen.getByLabelText("暱稱"), "Bob");
    await user.type(screen.getByLabelText("密碼"), "secret1");
    await user.click(screen.getByRole("button", { name: "註冊" }));
    expect(await screen.findByText("加入團隊需要提供邀請碼")).toBeInTheDocument();
  });
});
```

- [x] **Step 2: 執行測試確認失敗**

Run: `pnpm --filter @ftm/web test -- RegisterPage`
Expected: FAIL（找不到 `./RegisterPage`）。

- [x] **Step 3: 實作 RegisterPage**

`apps/web/src/features/auth/RegisterPage.tsx`：
```tsx
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, Link } from "react-router-dom";
import { registerSchema, type RegisterInput } from "@ftm/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ApiError } from "@/lib/api-client";
import { useRegister } from "./hooks";

export function RegisterPage() {
  const navigate = useNavigate();
  const registerMutation = useRegister();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { teamOption: "create" },
  });
  const teamOption = watch("teamOption");

  const onSubmit = async (values: RegisterInput) => {
    setServerError(null);
    try {
      await registerMutation.mutateAsync(values);
      navigate("/", { replace: true });
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "註冊失敗，請稍後再試");
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm p-6">
        <h1 className="mb-6 text-xl font-semibold">註冊</h1>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="username">用戶名</Label>
            <Input id="username" autoComplete="username" {...register("username")} />
            {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nickname">暱稱</Label>
            <Input id="nickname" {...register("nickname")} />
            {errors.nickname && <p className="text-sm text-destructive">{errors.nickname.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">密碼</Label>
            <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">團隊</legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" value="create" {...register("teamOption")} /> 建立新團隊
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" value="join" {...register("teamOption")} /> 加入團隊
            </label>
          </fieldset>

          {teamOption === "create" ? (
            <div className="space-y-1.5">
              <Label htmlFor="teamName">團隊名稱（可留空）</Label>
              <Input id="teamName" {...register("teamName")} />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="inviteCode">邀請碼</Label>
              <Input id="inviteCode" {...register("inviteCode")} />
              {errors.inviteCode && <p className="text-sm text-destructive">{errors.inviteCode.message}</p>}
            </div>
          )}

          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "註冊中…" : "註冊"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          已有帳號？<Link to="/login" className="underline">登入</Link>
        </p>
      </Card>
    </div>
  );
}
```

- [x] **Step 4: 執行測試確認通過**

Run: `pnpm --filter @ftm/web test -- RegisterPage`
Expected: 2 passed。

- [x] **Step 5: Commit**

```bash
git add apps/web/src/features/auth/RegisterPage.tsx apps/web/src/features/auth/RegisterPage.test.tsx
git commit -m "feat(web): add register page with create/join team branching"
```

---

### Task 9: 路由、守衛與啟動時 auth bootstrap

**Files:**
- Create: `apps/web/src/components/ProtectedRoute.tsx`
- Create: `apps/web/src/app/useBootstrapAuth.ts`
- Create: `apps/web/src/app/router.tsx`
- Modify: `apps/web/src/main.tsx`
- Test: `apps/web/src/components/ProtectedRoute.test.tsx`

- [x] **Step 1: 寫守衛失敗測試**

`apps/web/src/components/ProtectedRoute.test.tsx`：
```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { Routes, Route } from "react-router-dom";
import { renderWithProviders } from "@/test/test-utils";
import { useAuthStore } from "@/stores/auth-store";
import { ProtectedRoute } from "./ProtectedRoute";

beforeEach(() => {
  useAuthStore.setState({ accessToken: null, user: null, currentTeamId: null, isBootstrapped: true });
});

function Tree() {
  return (
    <Routes>
      <Route path="/login" element={<div>login-screen</div>} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<div>dashboard</div>} />
      </Route>
    </Routes>
  );
}

describe("ProtectedRoute", () => {
  it("redirects to /login when no token", () => {
    renderWithProviders(<Tree />, { route: "/" });
    expect(screen.getByText("login-screen")).toBeInTheDocument();
  });

  it("renders child route when authenticated", () => {
    useAuthStore.setState({ accessToken: "tok" });
    renderWithProviders(<Tree />, { route: "/" });
    expect(screen.getByText("dashboard")).toBeInTheDocument();
  });
});
```

- [x] **Step 2: 執行測試確認失敗**

Run: `pnpm --filter @ftm/web test -- ProtectedRoute`
Expected: FAIL（找不到 `./ProtectedRoute`）。

- [x] **Step 3: 實作 ProtectedRoute**

`apps/web/src/components/ProtectedRoute.tsx`：
```tsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store";

export function ProtectedRoute() {
  const accessToken = useAuthStore((s) => s.accessToken);
  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
```

- [x] **Step 4: 實作 bootstrap hook**

`apps/web/src/app/useBootstrapAuth.ts`：
```ts
import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { fetchMe } from "@/features/auth/api";
import { request } from "@/lib/api-client";
import type { ApiResponse } from "@ftm/shared";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

/** 啟動時：用 httpOnly cookie 嘗試 refresh 取得 accessToken，再抓 /me 重建登入態 */
export function useBootstrapAuth() {
  const isBootstrapped = useAuthStore((s) => s.isBootstrapped);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, { method: "POST", credentials: "include" });
        if (!res.ok) return;
        const json = (await res.json()) as ApiResponse<{ accessToken: string }>;
        if (!json.success) return;
        useAuthStore.getState().setAccessToken(json.data.accessToken);
        const me = await fetchMe();
        if (cancelled) return;
        useAuthStore.getState().setAuth({
          accessToken: useAuthStore.getState().accessToken!,
          user: me.user,
          currentTeamId: me.currentTeam?.id ?? me.user.currentTeamId,
        });
      } catch {
        // 未登入：保持登出態
      } finally {
        if (!cancelled) useAuthStore.getState().setBootstrapped(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return isBootstrapped;
}
```

- [x] **Step 5: 實作 router 與 main.tsx**

`apps/web/src/app/router.tsx`：
```tsx
import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { LoginPage } from "@/features/auth/LoginPage";
import { RegisterPage } from "@/features/auth/RegisterPage";
import { TaskListPage } from "@/features/tasks/TaskListPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <TaskListPage /> },
          { path: "/tasks", element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
```

`apps/web/src/main.tsx`（覆蓋 Task 1 的 placeholder）：
```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { queryClient } from "@/lib/query-client";
import { router } from "@/app/router";
import { useBootstrapAuth } from "@/app/useBootstrapAuth";
import "./index.css";

function Root() {
  const ready = useBootstrapAuth();
  if (!ready) {
    return <div className="flex min-h-svh items-center justify-center text-muted-foreground">載入中…</div>;
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
```

> 註：`AppLayout`、`TaskListPage` 於 Task 10、13 建立。本步驟 `main.tsx`/`router.tsx` 在那些檔案就緒前無法通過 typecheck，故先只跑 ProtectedRoute 單元測試，整合 typecheck 留待 Task 15。

- [x] **Step 6: 執行守衛測試確認通過**

Run: `pnpm --filter @ftm/web test -- ProtectedRoute`
Expected: 2 passed。

- [x] **Step 7: Commit**

```bash
git add apps/web/src/components/ProtectedRoute.tsx apps/web/src/components/ProtectedRoute.test.tsx apps/web/src/app
git commit -m "feat(web): add route guard, router and cookie-based auth bootstrap"
```

---

### Task 10: App 外殼佈局

**Files:**
- Create: `apps/web/src/components/AppLayout.tsx`

- [x] **Step 1: 實作 AppLayout（無獨立測試，於 Task 15 整合驗證）**

`apps/web/src/components/AppLayout.tsx`：
```tsx
import { Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";
import { useLogout } from "@/features/auth/hooks";
import { TeamSwitcher } from "@/features/teams/TeamSwitcher";

export function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const logoutMutation = useLogout();

  return (
    <div className="min-h-svh">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="font-semibold">家庭任務</span>
          <TeamSwitcher />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user?.nickname}</span>
          <Button variant="ghost" size="sm" onClick={() => logoutMutation.mutate()}>
            登出
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl p-4">
        <Outlet />
      </main>
    </div>
  );
}
```

- [x] **Step 2: Commit**

```bash
git add apps/web/src/components/AppLayout.tsx
git commit -m "feat(web): add app shell layout with team switcher and logout"
```

---

### Task 11: Teams API + hooks + TeamSwitcher

**Files:**
- Create: `apps/web/src/features/teams/api.ts`
- Create: `apps/web/src/features/teams/hooks.ts`
- Create: `apps/web/src/features/teams/TeamSwitcher.tsx`
- Test: `apps/web/src/features/teams/TeamSwitcher.test.tsx`

- [x] **Step 1: 寫失敗測試**

`apps/web/src/features/teams/TeamSwitcher.test.tsx`：
```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { server } from "@/test/msw-server";
import { renderWithProviders } from "@/test/test-utils";
import { useAuthStore } from "@/stores/auth-store";
import { TeamSwitcher } from "./TeamSwitcher";

const BASE = "http://localhost:8787/api";

beforeEach(() => {
  useAuthStore.setState({ accessToken: "tok", user: null, currentTeamId: 1, isBootstrapped: true });
});

describe("TeamSwitcher", () => {
  it("lists teams and switches current team", async () => {
    server.use(
      http.get(`${BASE}/teams`, () =>
        HttpResponse.json({
          success: true,
          data: {
            teams: [
              { id: 1, name: "家庭", inviteCode: "A", role: "admin", memberCount: 2, createdAt: 0 },
              { id: 2, name: "工作", inviteCode: "B", role: "member", memberCount: 3, createdAt: 0 },
            ],
            currentTeamId: 1,
          },
        }),
      ),
      http.post(`${BASE}/teams/switch`, async ({ request: req }) => {
        const body = (await req.json()) as { teamId: number };
        return HttpResponse.json({ success: true, data: { currentTeamId: body.teamId } });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<TeamSwitcher />);
    await user.click(await screen.findByRole("button", { name: /家庭/ }));
    await user.click(await screen.findByText("工作"));
    await waitFor(() => expect(useAuthStore.getState().currentTeamId).toBe(2));
  });
});
```

- [x] **Step 2: 執行測試確認失敗**

Run: `pnpm --filter @ftm/web test -- TeamSwitcher`
Expected: FAIL（找不到 `./TeamSwitcher`）。

- [x] **Step 3: 實作 teams api**

`apps/web/src/features/teams/api.ts`：
```ts
import type { TeamsListResponse } from "@ftm/shared";
import { request } from "@/lib/api-client";

export function fetchTeams() {
  return request<TeamsListResponse>("/teams");
}

export function switchTeam(teamId: number) {
  return request<{ currentTeamId: number }>("/teams/switch", {
    method: "POST",
    body: { teamId },
  });
}
```

- [x] **Step 4: 實作 teams hooks**

`apps/web/src/features/teams/hooks.ts`：
```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchTeams, switchTeam } from "./api";
import { useAuthStore } from "@/stores/auth-store";

export function useTeams() {
  return useQuery({ queryKey: ["teams"], queryFn: fetchTeams });
}

export function useSwitchTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: switchTeam,
    onSuccess: ({ currentTeamId }) => {
      useAuthStore.getState().setCurrentTeamId(currentTeamId);
      // 團隊變更 → 失效所有受團隊影響的查詢
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}
```

- [x] **Step 5: 實作 TeamSwitcher**

`apps/web/src/features/teams/TeamSwitcher.tsx`：
```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";
import { useTeams, useSwitchTeam } from "./hooks";

export function TeamSwitcher() {
  const currentTeamId = useAuthStore((s) => s.currentTeamId);
  const { data } = useTeams();
  const switchMutation = useSwitchTeam();

  const teams = data?.teams ?? [];
  const current = teams.find((t) => t.id === currentTeamId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          {current?.name ?? "選擇團隊"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {teams.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onSelect={() => {
              if (t.id !== currentTeamId) switchMutation.mutate(t.id);
            }}
          >
            {t.name}
            <span className="ml-2 text-xs text-muted-foreground">{t.memberCount} 人</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [x] **Step 6: 執行測試確認通過**

Run: `pnpm --filter @ftm/web test -- TeamSwitcher`
Expected: 1 passed。

- [x] **Step 7: Commit**

```bash
git add apps/web/src/features/teams
git commit -m "feat(web): add teams api, hooks and team switcher"
```

---

### Task 12: Tasks API + hooks

**Files:**
- Create: `apps/web/src/features/tasks/api.ts`
- Create: `apps/web/src/features/tasks/hooks.ts`
- Test: `apps/web/src/features/tasks/api.test.ts`

- [x] **Step 1: 寫失敗測試**

`apps/web/src/features/tasks/api.test.ts`：
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw-server";
import { useAuthStore } from "@/stores/auth-store";
import { fetchTasks, createTask } from "./api";

const BASE = "http://localhost:8787/api";

beforeEach(() => {
  useAuthStore.setState({ accessToken: "tok", user: null, currentTeamId: 1, isBootstrapped: true });
});

describe("tasks api", () => {
  it("fetchTasks without status calls /tasks", async () => {
    let url = "";
    server.use(
      http.get(`${BASE}/tasks`, ({ request: req }) => {
        url = new URL(req.url).search;
        return HttpResponse.json({ success: true, data: [] });
      }),
    );
    await fetchTasks("all");
    expect(url).toBe("");
  });

  it("fetchTasks with status adds query param", async () => {
    let url = "";
    server.use(
      http.get(`${BASE}/tasks`, ({ request: req }) => {
        url = new URL(req.url).search;
        return HttpResponse.json({ success: true, data: [] });
      }),
    );
    await fetchTasks("pending");
    expect(url).toBe("?status=pending");
  });

  it("createTask posts body and returns created task", async () => {
    server.use(
      http.post(`${BASE}/tasks`, () =>
        HttpResponse.json({ success: true, data: { id: 10, title: "買菜" } }, { status: 201 }),
      ),
    );
    const t = await createTask({ title: "買菜", priority: "high", status: "pending", taskType: "normal" });
    expect(t.id).toBe(10);
  });
});
```

- [x] **Step 2: 執行測試確認失敗**

Run: `pnpm --filter @ftm/web test -- tasks/api`
Expected: FAIL（找不到 `./api`）。

- [x] **Step 3: 實作 tasks api**

`apps/web/src/features/tasks/api.ts`：
```ts
import type {
  TaskResponse,
  TaskStatus,
  CreateTaskInput,
  UpdateTaskInput,
} from "@ftm/shared";
import { request } from "@/lib/api-client";

export type TaskStatusFilter = TaskStatus | "all";

export function fetchTasks(status: TaskStatusFilter) {
  const qs = status === "all" ? "" : `?status=${status}`;
  return request<TaskResponse[]>(`/tasks${qs}`);
}

export function createTask(input: CreateTaskInput) {
  return request<TaskResponse>("/tasks", { method: "POST", body: input });
}

export function updateTask(id: number, input: UpdateTaskInput) {
  return request<TaskResponse>(`/tasks/${id}`, { method: "PATCH", body: input });
}

export function deleteTask(id: number) {
  return request<{ message: string }>(`/tasks/${id}`, { method: "DELETE" });
}
```

- [x] **Step 4: 實作 tasks hooks**

`apps/web/src/features/tasks/hooks.ts`：
```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UpdateTaskInput } from "@ftm/shared";
import { useAuthStore } from "@/stores/auth-store";
import {
  fetchTasks,
  createTask,
  updateTask,
  deleteTask,
  type TaskStatusFilter,
} from "./api";

export function useTasks(status: TaskStatusFilter) {
  const teamId = useAuthStore((s) => s.currentTeamId);
  return useQuery({
    queryKey: ["tasks", teamId, status],
    queryFn: () => fetchTasks(status),
    enabled: teamId != null,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTask,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateTaskInput }) => updateTask(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteTask,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}
```

- [x] **Step 5: 執行測試確認通過**

Run: `pnpm --filter @ftm/web test -- tasks/api`
Expected: 3 passed。

- [x] **Step 6: Commit**

```bash
git add apps/web/src/features/tasks/api.ts apps/web/src/features/tasks/api.test.ts apps/web/src/features/tasks/hooks.ts
git commit -m "feat(web): add tasks api and react-query hooks with team-scoped keys"
```

---

### Task 13: TaskCard + TaskListPage（含狀態篩選與快速改狀態）

**Files:**
- Create: `apps/web/src/features/tasks/TaskCard.tsx`
- Create: `apps/web/src/features/tasks/TaskListPage.tsx`
- Test: `apps/web/src/features/tasks/TaskListPage.test.tsx`

- [x] **Step 1: 寫失敗測試**

`apps/web/src/features/tasks/TaskListPage.test.tsx`：
```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { screen } from "@testing-library/react";
import { server } from "@/test/msw-server";
import { renderWithProviders } from "@/test/test-utils";
import { useAuthStore } from "@/stores/auth-store";
import { TaskListPage } from "./TaskListPage";

const BASE = "http://localhost:8787/api";

const sampleTask = {
  id: 1, teamId: 1, title: "買菜", description: null,
  creatorId: 1, creatorNickname: "A", assigneeId: null, assigneeNickname: null,
  categoryId: null, categoryName: null, categoryColor: null,
  priority: "high", status: "pending", dueDate: "2026-06-10",
  taskType: "normal", recurrenceConfig: null, parentTaskId: null,
  completedAt: null, createdAt: 0, updatedAt: 0,
};

beforeEach(() => {
  useAuthStore.setState({ accessToken: "tok", user: null, currentTeamId: 1, isBootstrapped: true });
});

describe("TaskListPage", () => {
  it("renders tasks from the API", async () => {
    server.use(
      http.get(`${BASE}/tasks`, () => HttpResponse.json({ success: true, data: [sampleTask] })),
    );
    renderWithProviders(<TaskListPage />);
    expect(await screen.findByText("買菜")).toBeInTheDocument();
  });

  it("shows empty state when no tasks", async () => {
    server.use(
      http.get(`${BASE}/tasks`, () => HttpResponse.json({ success: true, data: [] })),
    );
    renderWithProviders(<TaskListPage />);
    expect(await screen.findByText("目前沒有任務")).toBeInTheDocument();
  });
});
```

- [x] **Step 2: 執行測試確認失敗**

Run: `pnpm --filter @ftm/web test -- TaskListPage`
Expected: FAIL（找不到 `./TaskListPage`）。

- [x] **Step 3: 實作 TaskCard**

`apps/web/src/features/tasks/TaskCard.tsx`：
```tsx
import type { TaskResponse, TaskStatus } from "@ftm/shared";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const STATUS_LABEL: Record<TaskStatus, string> = {
  pending: "待處理",
  in_progress: "進行中",
  completed: "已完成",
  cancelled: "已取消",
};

const PRIORITY_LABEL: Record<string, string> = { low: "低", medium: "中", high: "高" };

export function TaskCard({
  task,
  onStatusChange,
  onEdit,
  onDelete,
}: {
  task: TaskResponse;
  onStatusChange: (status: TaskStatus) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="flex items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{task.title}</span>
          <Badge variant="secondary">{PRIORITY_LABEL[task.priority]}</Badge>
          {task.categoryName && (
            <Badge style={{ backgroundColor: task.categoryColor ?? undefined }}>{task.categoryName}</Badge>
          )}
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          {task.assigneeNickname ? `指派給 ${task.assigneeNickname}` : "未指派"}
          {task.dueDate ? ` · 截止 ${task.dueDate}` : ""}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Select value={task.status} onValueChange={(v) => onStatusChange(v as TaskStatus)}>
          <SelectTrigger className="w-28" aria-label="狀態">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(STATUS_LABEL) as TaskStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" onClick={onEdit}>編輯</Button>
        <Button variant="ghost" size="sm" onClick={onDelete}>刪除</Button>
      </div>
    </Card>
  );
}
```

- [x] **Step 4: 實作 TaskListPage**

`apps/web/src/features/tasks/TaskListPage.tsx`：
```tsx
import { useState } from "react";
import type { TaskResponse, TaskStatus } from "@ftm/shared";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-client";
import { useTasks, useUpdateTask, useDeleteTask } from "./hooks";
import type { TaskStatusFilter } from "./api";
import { TaskCard } from "./TaskCard";
import { TaskFormDialog } from "./TaskFormDialog";

const FILTERS: { value: TaskStatusFilter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "pending", label: "待處理" },
  { value: "in_progress", label: "進行中" },
  { value: "completed", label: "已完成" },
  { value: "cancelled", label: "已取消" },
];

export function TaskListPage() {
  const [filter, setFilter] = useState<TaskStatusFilter>("all");
  const [editing, setEditing] = useState<TaskResponse | null>(null);
  const [creating, setCreating] = useState(false);
  const { data: tasks, isLoading } = useTasks(filter);
  const updateMutation = useUpdateTask();
  const deleteMutation = useDeleteTask();

  const onStatusChange = (task: TaskResponse, status: TaskStatus) => {
    updateMutation.mutate(
      { id: task.id, input: { status } },
      { onError: (e) => toast.error(e instanceof ApiError ? e.message : "更新失敗") },
    );
  };

  const onDelete = (task: TaskResponse) => {
    if (!confirm(`確定刪除任務「${task.title}」？`)) return;
    deleteMutation.mutate(task.id, {
      onError: (e) => toast.error(e instanceof ApiError ? e.message : "刪除失敗"),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Select value={filter} onValueChange={(v) => setFilter(v as TaskStatusFilter)}>
          <SelectTrigger className="w-32" aria-label="篩選狀態">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setCreating(true)}>新增任務</Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">載入中…</p>
      ) : tasks && tasks.length > 0 ? (
        <div className="space-y-3">
          {tasks.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              onStatusChange={(s) => onStatusChange(t, s)}
              onEdit={() => setEditing(t)}
              onDelete={() => onDelete(t)}
            />
          ))}
        </div>
      ) : (
        <p className="py-12 text-center text-muted-foreground">目前沒有任務</p>
      )}

      {creating && <TaskFormDialog open onOpenChange={(o) => !o && setCreating(false)} />}
      {editing && (
        <TaskFormDialog
          open
          task={editing}
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}
    </div>
  );
}
```

> 註：`TaskFormDialog` 於 Task 14 建立。本 Task 的測試只渲染列表/空狀態，不開啟對話框，故可先通過；整合 typecheck 於 Task 15。

- [x] **Step 5: 執行測試確認通過**

Run: `pnpm --filter @ftm/web test -- TaskListPage`
Expected: 2 passed。

- [x] **Step 6: Commit**

```bash
git add apps/web/src/features/tasks/TaskCard.tsx apps/web/src/features/tasks/TaskListPage.tsx apps/web/src/features/tasks/TaskListPage.test.tsx
git commit -m "feat(web): add task list page with status filter and quick status change"
```

---

### Task 14: TaskFormDialog（建立/編輯，RHF + zod）

**Files:**
- Create: `apps/web/src/features/tasks/TaskFormDialog.tsx`
- Test: `apps/web/src/features/tasks/TaskFormDialog.test.tsx`

- [x] **Step 1: 寫失敗測試**

`apps/web/src/features/tasks/TaskFormDialog.test.tsx`：
```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { server } from "@/test/msw-server";
import { renderWithProviders } from "@/test/test-utils";
import { useAuthStore } from "@/stores/auth-store";
import { TaskFormDialog } from "./TaskFormDialog";

const BASE = "http://localhost:8787/api";

beforeEach(() => {
  useAuthStore.setState({ accessToken: "tok", user: null, currentTeamId: 1, isBootstrapped: true });
});

describe("TaskFormDialog", () => {
  it("creates a task on submit", async () => {
    let posted: unknown = null;
    server.use(
      http.post(`${BASE}/tasks`, async ({ request: req }) => {
        posted = await req.json();
        return HttpResponse.json({ success: true, data: { id: 1 } }, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<TaskFormDialog open onOpenChange={() => {}} />);
    await user.type(screen.getByLabelText("標題"), "倒垃圾");
    await user.click(screen.getByRole("button", { name: "建立" }));
    await waitFor(() => expect(posted).toMatchObject({ title: "倒垃圾" }));
  });

  it("shows validation error when title is empty", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TaskFormDialog open onOpenChange={() => {}} />);
    await user.click(screen.getByRole("button", { name: "建立" }));
    expect(await screen.findByText(/標題|title|至少|required/i)).toBeInTheDocument();
  });
});
```

- [x] **Step 2: 執行測試確認失敗**

Run: `pnpm --filter @ftm/web test -- TaskFormDialog`
Expected: FAIL（找不到 `./TaskFormDialog`）。

- [x] **Step 3: 實作 TaskFormDialog**

`apps/web/src/features/tasks/TaskFormDialog.tsx`：
```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createTaskSchema, type CreateTaskInput, type TaskResponse } from "@ftm/shared";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-client";
import { useCreateTask, useUpdateTask } from "./hooks";

export function TaskFormDialog({
  open,
  task,
  onOpenChange,
}: {
  open: boolean;
  task?: TaskResponse;
  onOpenChange: (open: boolean) => void;
}) {
  const isEdit = !!task;
  const createMutation = useCreateTask();
  const updateMutation = useUpdateTask();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      priority: task?.priority ?? "medium",
      status: task?.status ?? "pending",
      taskType: task?.taskType ?? "normal",
      dueDate: task?.dueDate ?? null,
    },
  });

  const onSubmit = async (values: CreateTaskInput) => {
    try {
      if (isEdit && task) {
        await updateMutation.mutateAsync({ id: task.id, input: values });
      } else {
        await createMutation.mutateAsync(values);
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "儲存失敗");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "編輯任務" : "新增任務"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="title">標題</Label>
            <Input id="title" {...register("title")} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">描述</Label>
            <Textarea id="description" {...register("description")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>優先級</Label>
              <Select
                defaultValue={watch("priority")}
                onValueChange={(v) => setValue("priority", v as CreateTaskInput["priority"])}
              >
                <SelectTrigger aria-label="優先級">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">低</SelectItem>
                  <SelectItem value="medium">中</SelectItem>
                  <SelectItem value="high">高</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dueDate">截止日期</Label>
              <Input id="dueDate" type="date" {...register("dueDate")} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isEdit ? "儲存" : "建立"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

> 註：`createTaskSchema` 的 `dueDate` 為 `YYYY-MM-DD` regex、nullable optional；空字串需在送出前轉 `null`。若測試顯示空 `dueDate` 觸發 regex 錯誤，於 `onSubmit` 開頭加：`if (!values.dueDate) values.dueDate = null;`

- [x] **Step 4: 執行測試確認通過**

Run: `pnpm --filter @ftm/web test -- TaskFormDialog`
Expected: 2 passed。若 `dueDate` 空字串造成 create 測試失敗，套用上方註記的轉換後重跑。

- [x] **Step 5: Commit**

```bash
git add apps/web/src/features/tasks/TaskFormDialog.tsx apps/web/src/features/tasks/TaskFormDialog.test.tsx
git commit -m "feat(web): add task create/edit dialog with RHF + zod"
```

---

### Task 15: 整合驗證、全量 typecheck 與部署設定

**Files:**
- Create: `apps/web/public/_redirects`（Cloudflare Pages SPA 路由 fallback）
- Modify: 視 typecheck 結果修正細節

- [x] **Step 1: 建立 Pages SPA fallback**

`apps/web/public/_redirects`：
```
/*    /index.html   200
```

- [x] **Step 2: 全量 typecheck**

Run: `pnpm --filter @ftm/web typecheck`
Expected: 無錯誤。若報 `verbatimModuleSyntax` 相關的 type-only import 錯誤，將該 import 改為 `import type`。

- [x] **Step 3: 全量測試**

Run: `pnpm --filter @ftm/web test`
Expected: 全部 passed（auth-store 3、api-client 4、auth/api 2、LoginPage 2、RegisterPage 2、ProtectedRoute 2、TeamSwitcher 1、tasks/api 3、TaskListPage 2、TaskFormDialog 2、smoke 1）。

- [x] **Step 4: 生產建置**

Run: `pnpm --filter @ftm/web build`
Expected: `tsc -b` 通過且 `vite build` 產出 `apps/web/dist`。

- [x] **Step 5: 手動端到端驗證（對接已部署後端）**

先啟動前端 dev（連線生產 API）：
```bash
cd apps/web && VITE_API_BASE_URL=https://ftm-api.dylan-chiang.workers.dev/api pnpm dev
```
在瀏覽器 http://localhost:5173 手動驗證：
1. 註冊新帳號（create 模式）→ 自動進入任務列表
2. 新增任務 → 出現在列表
3. 下拉改任務狀態 → 持久化（重整後仍在）
4. 編輯任務標題 → 更新成功
5. 刪除任務 → 從列表消失
6. 重整頁面 → 仍保持登入（cookie refresh 生效）
7. 登出 → 跳回登入頁；重整後仍為登出態

Expected: 全部行為正常。確認後 Ctrl-C。

> ⚠️ 跨站 cookie：dev 連生產 API 時前端為 `http://localhost:5173`、API 為 `https://...workers.dev`，屬跨站。後端生產環境 cookie 為 `SameSite=None; Secure`，且 CORS `ALLOWED_ORIGINS` 需包含 `http://localhost:5173`（dev 已在 `DEV_ORIGINS` 內）。若 refresh 不生效，改用本地後端 `pnpm dev:api` + 預設 `.env.development` 測試（同站 localhost）。

- [x] **Step 6: Commit**

```bash
git add apps/web/public/_redirects
git commit -m "chore(web): add Pages SPA redirect and finalize Phase 2 integration"
```

---

## Self-Review 結果

**Spec 覆蓋（對照 06-frontend.md）：**
- ✅ §2 技術選型：React+Vite+TS+Tailwind+shadcn+TanStack Query+Zustand+RHF（Task 1-3, 4, 12）
- ✅ §3 狀態分層：服務端→Query、全域→Zustand（auth/currentTeamId）、局部→useState（Task 4, 12）
- ✅ §4 feature-based 目錄：auth/teams/tasks 各含 api/hooks/components（Task 6-14）
- ✅ §5 API 客戶端封裝 + 401 refresh 重放（Task 5）；queryKey 帶 teamId（Task 12）
- ✅ §6 路由：/login /register / /tasks + 守衛（Task 9）
- ⏸ §6 行動端底部 Tab / 桌面側邊欄 → Phase 6（本階段先用簡單 header 外殼）
- ⏸ §7 週期任務展開、§8 農曆、§9 PWA、§10 暗色模式 → Phase 4 / Phase 6
- ✅ 認證 cookie refresh 流程（Task 5, 9）對齊後端實作

**Placeholder 掃描：** 無 TBD/TODO；所有程式步驟含完整程式碼；config 步驟用驗證指令取代測試（合理，因無邏輯可測）。

**型別一致性：** `request<T>` 簽章、`ApiError(status, code, message, details)`、store 的 `setAuth/setAccessToken/setCurrentTeamId/clearAuth/setBootstrapped`、hooks 的 `useTasks/useCreateTask/useUpdateTask/useDeleteTask` 在各 Task 間一致；`TeamsListResponse`、`TaskResponse`、`CreateTaskInput`、`LoginInput`、`RegisterInput` 均來自 `@ftm/shared`（已存在）。

**已知跨 Task 依賴（已在註記說明）：** `main.tsx`/`router.tsx`（Task 9）引用 `AppLayout`（Task 10）、`TaskListPage`（Task 13）；`TaskListPage`（Task 13）引用 `TaskFormDialog`（Task 14）。各 Task 的單元測試獨立可過，整合 typecheck 集中於 Task 15。建議依序執行。
