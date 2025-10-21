import crypto from 'crypto';

function getKey(): Buffer | null {
  const keyStr = process.env.FIELD_ENCRYPTION_KEY;
  if (!keyStr) return null;

  // Try base64
  try {
    const base64Buf = Buffer.from(keyStr, 'base64');
    if (base64Buf.length === 32) return base64Buf;
  } catch {}

  // Try hex
  try {
    const hexBuf = Buffer.from(keyStr, 'hex');
    if (hexBuf.length === 32) return hexBuf;
  } catch {}

  // Fallback: treat as raw utf-8 string if 32 chars (dev convenience)
  if (keyStr.length === 32) {
    const rawBuf = Buffer.from(keyStr, 'utf8');
    if (rawBuf.length === 32) return rawBuf;
  }

  return null;
}

function encrypt(plaintext: string): string {
  const key = getKey();
  if (!key) return plaintext; // no-op if key missing (dev convenience)
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('base64'), encrypted.toString('base64'), authTag.toString('base64')].join(':');
}

function decrypt(ciphertext: string): string {
  const key = getKey();
  if (!key) return ciphertext; // no-op if key missing (dev convenience)
  const [ivB64, encB64, tagB64] = ciphertext.split(':');
  const iv = Buffer.from(ivB64, 'base64');
  const encrypted = Buffer.from(encB64, 'base64');
  const authTag = Buffer.from(tagB64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

export const ProviderResponseEncryptionTransformer = {
  to: (value: any) => {
    if (value === null || value === undefined) return value;
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    return encrypt(str);
  },
  from: (value: any) => {
    if (value === null || value === undefined) return value;
    const decrypted = decrypt(value);
    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted;
    }
  },
};