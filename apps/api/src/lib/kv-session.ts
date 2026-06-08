// KV refresh token 管理
// Key 格式: refresh:{userId}:{jti}
// TTL 設為 30 天 + 1 天緩衝

const SESSION_PREFIX = "refresh:";
const TTL_SEC = 31 * 24 * 60 * 60; // 31 天

export interface SessionEntry {
  userId: number;
  jti: string;
  createdAt: number;
}

export async function saveRefreshToken(
  kv: KVNamespace,
  userId: number,
  jti: string,
): Promise<void> {
  const key = `${SESSION_PREFIX}${userId}:${jti}`;
  const entry: SessionEntry = {
    userId,
    jti,
    createdAt: Date.now(),
  };
  await kv.put(key, JSON.stringify(entry), { expirationTtl: TTL_SEC });
}

export async function validateRefreshToken(
  kv: KVNamespace,
  userId: number,
  jti: string,
): Promise<boolean> {
  const key = `${SESSION_PREFIX}${userId}:${jti}`;
  const raw = await kv.get(key);
  return raw !== null;
}

export async function revokeRefreshToken(
  kv: KVNamespace,
  userId: number,
  jti: string,
): Promise<void> {
  const key = `${SESSION_PREFIX}${userId}:${jti}`;
  await kv.delete(key);
}

// 改密碼或全端登出：刪除該用戶所有 refresh token
export async function revokeAllUserSessions(
  kv: KVNamespace,
  userId: number,
): Promise<void> {
  const prefix = `${SESSION_PREFIX}${userId}:`;
  const list = await kv.list({ prefix });
  for (const key of list.keys) {
    await kv.delete(key.name);
  }
}
