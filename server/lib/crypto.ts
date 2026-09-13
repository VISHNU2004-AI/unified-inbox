import crypto from 'crypto';

const RAW_KEY = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'unified_inbox_token_encryption_fallback_key_2026';
// Derive a 32-byte key using sha256
const CIPHER_KEY = crypto.createHash('sha256').update(RAW_KEY).digest();
const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypt a plaintext token using AES-256-GCM.
 * Output format: <iv_hex>:<auth_tag_hex>:<encrypted_hex>
 */
export function encryptToken(plaintext: string): string {
  if (!plaintext) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, CIPHER_KEY, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt an AES-256-GCM encrypted token string.
 */
export function decryptToken(encryptedString: string): string | null {
  if (!encryptedString) return null;
  try {
    const parts = encryptedString.split(':');
    if (parts.length !== 3) {
      // Fallback for legacy unencrypted test tokens if any
      return encryptedString;
    }
    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, CIPHER_KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('[Crypto] Decryption failed:', err);
    return null;
  }
}
