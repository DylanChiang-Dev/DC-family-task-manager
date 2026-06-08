// Worker 運行時環境綁定（與 wrangler.toml 對應）。
// 隨着 D1 / KV / Secrets 啟用，在此補充對應類型。
export interface Env {
  ENVIRONMENT: string;
  // DB: D1Database;        // Phase 1 啟用
  // SESSIONS: KVNamespace; // Phase 1 啟用
  // JWT_SECRET: string;    // Secret，Phase 1 啟用
}

// Hono 的 context 變量類型（中間件注入）。
export interface Variables {
  userId?: number;
  teamId?: number;
}
