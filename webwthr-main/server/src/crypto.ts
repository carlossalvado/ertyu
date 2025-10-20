import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

export function encrypt(text: string, keyBase64: string) {
  const key = Buffer.from(keyBase64, 'base64');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decrypt(payloadBase64: string, keyBase64: string) {
  const key = Buffer.from(keyBase64, 'base64');
  const payload = Buffer.from(payloadBase64, 'base64');
  const iv = payload.slice(0, 12);
  const tag = payload.slice(12, 28);
  const encrypted = payload.slice(28);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}
