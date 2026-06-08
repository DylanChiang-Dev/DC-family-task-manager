// 生成 6 位邀請碼，排除易混淆字符 0, O, I, 1

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateInviteCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CHARS[bytes[i]! % CHARS.length];
  }
  return code;
}
