// WebCrypto PBKDF2 密碼哈希（Workers 原生支持）

// CF Workers WebCrypto PBKDF2 limit is 100,000 iterations
const ITERATIONS = 100_000;
const KEY_LEN_BITS = 256;
const SALT_LEN_BYTES = 16;

function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

/** 恆定時間字串比較，防止時序攻擊 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function decodeBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN_BYTES));
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const derived = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    key,
    KEY_LEN_BITS,
  );
  const saltB64 = encodeBase64(salt);
  const hashB64 = encodeBase64(new Uint8Array(derived));
  // 格式: iterations$salt$hash
  return `${ITERATIONS}$${saltB64}$${hashB64}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 3) return false;
  const iterations = Number(parts[0]);
  if (Number.isNaN(iterations)) return false;

  const salt = decodeBase64(parts[1]!);
  const expectedHash = parts[2]!;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const derived = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256",
    },
    key,
    KEY_LEN_BITS,
  );
  const hashB64 = encodeBase64(new Uint8Array(derived));
  return constantTimeEqual(hashB64, expectedHash);
}
