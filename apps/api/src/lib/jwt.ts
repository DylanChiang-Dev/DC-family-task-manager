import { sign, verify } from "hono/jwt";

export interface AccessTokenPayload {
  sub: number;
  username: string;
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  sub: number;
  jti: string;
  iat: number;
  exp: number;
}

const ACCESS_EXPIRY_SEC = 15 * 60; // 15 分鐘
const REFRESH_EXPIRY_SEC = 30 * 24 * 60 * 60; // 30 天

export async function signAccessToken(
  payload: Omit<AccessTokenPayload, "iat" | "exp">,
  secret: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign(
    { ...payload, iat: now, exp: now + ACCESS_EXPIRY_SEC },
    secret,
    "HS256",
  );
}

export async function signRefreshToken(
  payload: Omit<RefreshTokenPayload, "iat" | "exp">,
  secret: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign(
    { ...payload, iat: now, exp: now + REFRESH_EXPIRY_SEC },
    secret,
    "HS256",
  );
}

export async function verifyAccessToken(
  token: string,
  secret: string,
): Promise<AccessTokenPayload | null> {
  try {
    const payload = await verify(token, secret, "HS256");
    return payload as unknown as AccessTokenPayload;
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(
  token: string,
  secret: string,
): Promise<RefreshTokenPayload | null> {
  try {
    const payload = await verify(token, secret, "HS256");
    return payload as unknown as RefreshTokenPayload;
  } catch {
    return null;
  }
}

export function generateJti(): string {
  return crypto.randomUUID();
}
