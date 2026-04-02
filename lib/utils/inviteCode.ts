const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;

export function generateCode(): string {
  const pick = (index: number) => ALPHABET[index % ALPHABET.length];

  try {
    if (typeof globalThis.crypto?.getRandomValues === 'function') {
      const bytes = new Uint8Array(CODE_LENGTH);
      globalThis.crypto.getRandomValues(bytes);
      return Array.from(bytes, pick).join('');
    }
  } catch {
    // Fallback below.
  }

  return Array.from({ length: CODE_LENGTH }, () => {
    const index = Math.floor(Math.random() * ALPHABET.length);
    return ALPHABET[index];
  }).join('');
}
