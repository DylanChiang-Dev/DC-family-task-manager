// 生成 6 位邀請碼，排除易混淆字符 0, O, I, 1

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CHARS_LEN = CHARS.length; // 30
// 最大可接受值：floor(256 / 30) * 30 = 240，>= 240 的值捨棄以消除模偏差
const MAX_ACCEPTABLE = Math.floor(256 / CHARS_LEN) * CHARS_LEN;

export function generateInviteCode(): string {
  let code = "";
  while (code.length < 6) {
    const bytes = crypto.getRandomValues(new Uint8Array(8)); // 多取一些以減少循環
    for (let i = 0; i < bytes.length && code.length < 6; i++) {
      if (bytes[i]! < MAX_ACCEPTABLE) {
        code += CHARS[bytes[i]! % CHARS_LEN];
      }
    }
  }
  return code;
}
