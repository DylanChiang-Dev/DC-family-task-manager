export interface Env {
  ENVIRONMENT: string;
  DB: D1Database;
  SESSIONS: KVNamespace;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  /** Optional: Resend API key for email notifications */
  RESEND_API_KEY?: string;
  /** Optional: From address for email notifications */
  MAIL_FROM?: string;
}

export interface Variables {
  userId?: number;
  teamId?: number;
  memberRole?: "admin" | "member";
}
