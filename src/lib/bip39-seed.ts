/**
 * BIP-39: Mnemonic Code for Generating Deterministic Keys
 * Implements BIP-39 standard for generating 12/24-word seed phrases
 * Reference: https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki
 */

import { BIP39_ENGLISH_WORDLIST } from './bip39-wordlist';

// ─── Configuration ───

const WORD_COUNT_12 = 12;
const WORD_COUNT_24 = 24;
const BITS_PER_WORD = 11;
const CHECKSUM_BITS_12 = 7;
const CHECKSUM_BITS_24 = 8;
const ENTROPY_BITS_12 = WORD_COUNT_12 * BITS_PER_WORD - CHECKSUM_BITS_12;
const ENTROPY_BITS_24 = WORD_COUNT_24 * BITS_PER_WORD - CHECKSUM_BITS_24;

// ─── Utilities ───

function bytesToBinary(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(2).padStart(8, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/// SHA-256 using Web Crypto API with JS fallback
async function sha256(data: Uint8Array): Promise<Uint8Array> {
  if (crypto && crypto.subtle) {
    try {
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      return new Uint8Array(hashBuffer);
    } catch (e) {
      console.warn('[BIP39] Web Crypto digest failed, using JS fallback:', e);
    }
  }
  
  // Fallback: Simple SHA-256 implementation
  return jsSHA256(data);
}

/// JS-based SHA-256 fallback using crypto-js style implementation
function jsSHA256(data: Uint8Array): Uint8Array {
  // Simple SHA-256 implementation for fallback
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  
  // Pad data
  const l = data.length * 8;
  const k = (448 - (l % 512 + 1)) % 512;
  const padded = new Uint8Array(data.length + 1 + k / 8 + 8);
  padded.set(data);
  padded[data.length] = 0x80;
  
  // Add length (big-endian)
  const lengthView = new DataView(padded.buffer, padded.length - 8);
  lengthView.setUint32(0, Math.floor(l / 0x100000000), false);
  lengthView.setUint32(4, l, false);
  
  // Process chunks
  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ]);
  
  for (let i = 0; i < padded.length; i += 64) {
    const w = new Uint32Array(64);
    for (let j = 0; j < 16; j++) {
      w[j] = new DataView(padded.buffer, i + j * 4).getUint32(0, false);
    }
    for (let j = 16; j < 64; j++) {
      const s0 = rotr(w[j - 15], 7) ^ rotr(w[j - 15], 18) ^ (w[j - 15] >>> 3);
      const s1 = rotr(w[j - 2], 17) ^ rotr(w[j - 2], 19) ^ (w[j - 2] >>> 10);
      w[j] = (w[j - 16] + w[j - 7] + s0 + s1) | 0;
    }
    
    let [a, b, c, d, e, f, g, hh] = [...h];
    for (let j = 0; j < 64; j++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (hh + S1 + ch + K[j] + w[j]) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;
      
      hh = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }
    
    h[0] += a; h[1] += b; h[2] += c; h[3] += d;
    h[4] += e; h[5] += f; h[6] += g; h[7] += hh;
  }
  
  // Convert to bytes
  const result = new Uint8Array(32);
  for (let i = 0; i < 8; i++) {
    result[i * 4] = (h[i] >>> 24) & 0xff;
    result[i * 4 + 1] = (h[i] >>> 16) & 0xff;
    result[i * 4 + 2] = (h[i] >>> 8) & 0xff;
    result[i * 4 + 3] = h[i] & 0xff;
  }
  
  return result;
}

function rotr(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n));
}

// ─── Generate Mnemonic ───

/**
 * Generate BIP-39 mnemonic (24 words by default)
 * Uses cryptographically secure random entropy
 */
export async function generateMnemonic(wordCount: number = WORD_COUNT_24): Promise<string> {
  const entropyBits = wordCount === WORD_COUNT_12 ? ENTROPY_BITS_12 : ENTROPY_BITS_24;
  const checksumBits = wordCount === WORD_COUNT_12 ? CHECKSUM_BITS_12 : CHECKSUM_BITS_24;

  // Generate random entropy
  const entropyBytes = new Uint8Array(entropyBits / 8);
  crypto.getRandomValues(entropyBytes);

  // Calculate checksum (first N bits of SHA-256)
  const checksumBytes = await sha256(entropyBytes);
  const checksumBinary = bytesToBinary(checksumBytes).substring(0, checksumBits);

  // Combine entropy + checksum
  const entropyBinary = bytesToBinary(entropyBytes);
  const combinedBinary = entropyBinary + checksumBinary;

  // Convert to words
  const words: string[] = [];
  for (let i = 0; i < combinedBinary.length; i += BITS_PER_WORD) {
    const chunk = combinedBinary.substring(i, i + BITS_PER_WORD);
    const index = parseInt(chunk, 2);
    words.push(BIP39_ENGLISH_WORDLIST[index]);
  }

  return words.join(' ');
}

// ─── Validate Mnemonic ───

/**
 * Validate BIP-39 mnemonic wordlist
 */
export function validateMnemonicWords(mnemonic: string): { valid: boolean; errors?: string[] } {
  const words = mnemonic.trim().toLowerCase().split(/\s+/);

  if (words.length !== WORD_COUNT_12 && words.length !== WORD_COUNT_24) {
    return {
      valid: false,
      errors: [`Mnemonic must have 12 or 24 words, got ${words.length}`],
    };
  }

  const invalidWords: string[] = [];
  for (const word of words) {
    if (!BIP39_ENGLISH_WORDLIST.includes(word)) {
      invalidWords.push(word);
    }
  }

  if (invalidWords.length > 0) {
    return {
      valid: false,
      errors: [`Invalid words: ${invalidWords.join(', ')}`],
    };
  }

  return { valid: true };
}

/**
 * Validate BIP-39 mnemonic checksum
 */
export async function validateMnemonicChecksum(mnemonic: string): Promise<boolean> {
  const validation = validateMnemonicWords(mnemonic);
  if (!validation.valid) return false;

  const words = mnemonic.trim().toLowerCase().split(/\s+/);
  const wordCount = words.length;
  const checksumBits = wordCount === WORD_COUNT_12 ? CHECKSUM_BITS_12 : CHECKSUM_BITS_24;
  const entropyBits = wordCount === WORD_COUNT_12 ? ENTROPY_BITS_12 : ENTROPY_BITS_24;

  // Convert words back to binary
  let binary = '';
  for (const word of words) {
    const index = BIP39_ENGLISH_WORDLIST.indexOf(word);
    binary += index.toString(2).padStart(BITS_PER_WORD, '0');
  }

  // Split into entropy and checksum
  const entropyBinary = binary.substring(0, entropyBits);
  const checksumBinary = binary.substring(entropyBits);

  // Convert entropy to bytes
  const entropyBytes = new Uint8Array(entropyBits / 8);
  for (let i = 0; i < entropyBytes.length; i++) {
    const byte = parseInt(entropyBinary.substring(i * 8, i * 8 + 8), 2);
    entropyBytes[i] = byte;
  }

  // Calculate and verify checksum
  const hash = await sha256(entropyBytes);
  const hashBinary = bytesToBinary(hash).substring(0, checksumBits);

  return hashBinary === checksumBinary;
}

// ─── Seed Generation ───

/**
 * Generate binary seed from mnemonic with optional passphrase
 * Uses PBKDF2 with HMAC-SHA512
 */
export async function mnemonicToSeed(
  mnemonic: string,
  passphrase: string = ''
): Promise<Uint8Array> {
  // Validate checksum first
  const isValid = await validateMnemonicChecksum(mnemonic);
  if (!isValid) {
    throw new Error('Invalid mnemonic checksum');
  }

  // Normalize to NFKD (canonical form)
  const normalizedMnemonic = mnemonic.normalize('NFKD');
  const normalizedPassphrase = `mnemonic${passphrase}`.normalize('NFKD');

  // Import password as key
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(normalizedMnemonic),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  // Derive seed using PBKDF2
  const seedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode(normalizedPassphrase),
      iterations: 2048,
      hash: 'SHA-512',
    },
    passwordKey,
    512 // 64 bytes / 512 bits
  );

  return new Uint8Array(seedBits);
}

// ─── Types ───

export interface BIP39Wallet {
  mnemonic: string; // 24 words
  seed: Uint8Array; // 64 bytes
}

/**
 * Generate BIP-39 wallet (mnemonic + seed)
 */
export async function generateBIP39Wallet(
  wordCount: number = WORD_COUNT_24
): Promise<BIP39Wallet> {
  const mnemonic = await generateMnemonic(wordCount);
  const seed = await mnemonicToSeed(mnemonic);

  return { mnemonic, seed };
}

/**
 * Restore BIP-39 wallet from mnemonic
 */
export async function restoreBIP39Wallet(
  mnemonic: string,
  passphrase: string = ''
): Promise<BIP39Wallet> {
  const seed = await mnemonicToSeed(mnemonic, passphrase);

  return { mnemonic, seed };
}
