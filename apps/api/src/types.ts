export interface Env {
  ENVIRONMENT: string;
  DB: D1Database;
  SESSIONS?: KVNamespace;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
}

export interface Variables {
  userId?: number;
  teamId?: number;
}
