/**
 * Real Monero wallet generator using ed25519 elliptic curve cryptography.
 * Generates cryptographically valid Monero primary addresses, subaddresses,
 * and 25-word mnemonic seed phrases with proper checksums.
 *
 * References:
 *   - knaccc/subaddress-js (subaddress derivation algorithm)
 *   - Monero source: src/mnemonics/english.h, src/crypto/crypto.cpp
 *   - docs.getmonero.org/mnemonics/legacy/
 */

import elliptic from 'elliptic';
import BN from 'bn.js';
import { keccak_256 } from 'js-sha3';
import { MONERO_ENGLISH_WORDLIST, MONERO_ENGLISH_PREFIX_LENGTH } from './monero-wordlist';

// ─── Ed25519 setup ───
const ed = new (elliptic as any).eddsa('ed25519');

// Ed25519 group order (l)
const L = new BN(
  '7237005577332262213973186563042994240857116359379907606001950938285454250989',
  10
);

// ─── Hex / byte utilities ───

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array | number[]): string {
  return Array.from(bytes)
    .map((b) => (b & 0xff).toString(16).padStart(2, '0'))
    .join('');
}

function randomBytes(n: number): Uint8Array {
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  return bytes;
}

// ─── Keccak-256 (returns hex string) ───

function fastHash(hex: string): string {
  return keccak_256(hexToBytes(hex));
}

// ─── Scalar helpers ───

/** Little-endian hex → BN */
function leHexToBN(hex: string): BN {
  const beHex = hex.match(/../g)!.reverse().join('');
  return new BN(beHex, 16);
}

/** BN → little-endian hex (zero-padded to byteLen) */
function bnToLeHex(bn: BN, byteLen: number): string {
  const beHex = bn.toString(16).padStart(byteLen * 2, '0');
  return beHex.match(/../g)!.reverse().join('');
}

/** sc_reduce32: reduce a 32-byte LE scalar mod l */
function scReduce32(hexLE: string): string {
  return bnToLeHex(leHexToBN(hexLE).umod(L), 32);
}

/** Hash-to-scalar: keccak256 then reduce mod l */
function hashToScalar(hex: string): BN {
  const h = fastHash(hex);
  return leHexToBN(h).umod(L);
}

// ─── Point helpers ───

function pointToHex(point: any): string {
  const encoded: number[] = ed.encodePoint(point);
  return bytesToHex(encoded);
}

/** Derive public key from secret key: P = G * s */
function secretKeyToPublicKey(secretKeyHex: string): string {
  const scalar = leHexToBN(secretKeyHex);
  const point = ed.curve.g.mul(scalar);
  return pointToHex(point);
}

// ─── Monero Base58 (CryptoNote variant) ───

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const ENCODED_BLOCK_SIZES = [0, 2, 3, 5, 6, 7, 9, 10, 11];
const FULL_BLOCK_SIZE = 8;
const FULL_ENCODED_BLOCK_SIZE = 11;

function encodeBlock(data: Uint8Array, buf: number[], index: number): void {
  let num = new BN(0);
  const base = new BN(256);
  for (let i = 0; i < data.length; i++) {
    num = num.mul(base).add(new BN(data[i]));
  }
  let pos = ENCODED_BLOCK_SIZES[data.length] - 1;
  const fiftyEight = new BN(58);
  while (num.gt(new BN(0))) {
    const rem = num.umod(fiftyEight);
    num = num.div(fiftyEight);
    buf[index + pos] = BASE58_ALPHABET.charCodeAt(rem.toNumber());
    pos--;
  }
}

function cnBase58Encode(hex: string): string {
  const data = hexToBytes(hex);
  const fullBlocks = Math.floor(data.length / FULL_BLOCK_SIZE);
  const lastBlockSize = data.length % FULL_BLOCK_SIZE;
  const resSize =
    fullBlocks * FULL_ENCODED_BLOCK_SIZE +
    ENCODED_BLOCK_SIZES[lastBlockSize];

  const res: number[] = new Array(resSize).fill(
    BASE58_ALPHABET.charCodeAt(0)
  );

  for (let i = 0; i < fullBlocks; i++) {
    encodeBlock(
      data.slice(i * FULL_BLOCK_SIZE, (i + 1) * FULL_BLOCK_SIZE),
      res,
      i * FULL_ENCODED_BLOCK_SIZE
    );
  }
  if (lastBlockSize > 0) {
    encodeBlock(
      data.slice(fullBlocks * FULL_BLOCK_SIZE),
      res,
      fullBlocks * FULL_ENCODED_BLOCK_SIZE
    );
  }

  return String.fromCharCode(...res);
}

// ─── Address encoding ───

const MAINNET_ADDRESS_PREFIX = '12'; // → addresses start with '4'
const MAINNET_SUBADDRESS_PREFIX = '2a'; // → addresses start with '8'

// "SubAddr\0" as hex
const SUBADDR_PREFIX = '5375624164647200';

function encodeAddress(
  prefix: string,
  pubSpendHex: string,
  pubViewHex: string
): string {
  const data = prefix + pubSpendHex + pubViewHex;
  const checksum = fastHash(data).substring(0, 8);
  return cnBase58Encode(data + checksum);
}

function intToLE32Hex(value: number): string {
  let h = value.toString(16);
  while (h.length < 8) h = '0' + h;
  return h.match(/../g)!.reverse().join('');
}

// ─── CRC32 (for mnemonic checksum) ───

function crc32(str: string): number {
  let crc = 0xffffffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i);
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ─── Mnemonic seed encoding (Monero legacy 25-word) ───

function seedToMnemonic(seedHex: string): string[] {
  const n = MONERO_ENGLISH_WORDLIST.length; // 1626
  const words: string[] = [];

  for (let i = 0; i < 32; i += 4) {
    const chunk = seedHex.substr(i * 2, 8);
    const bytes = hexToBytes(chunk);
    const val =
      (bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24)) >>>
      0;

    const w1 = val % n;
    const w2 = (Math.floor(val / n) + w1) % n;
    const w3 = (Math.floor(Math.floor(val / n) / n) + w2) % n;

    words.push(MONERO_ENGLISH_WORDLIST[w1]);
    words.push(MONERO_ENGLISH_WORDLIST[w2]);
    words.push(MONERO_ENGLISH_WORDLIST[w3]);
  }

  // 25th word = checksum
  const prefixes = words
    .map((w) => w.substring(0, MONERO_ENGLISH_PREFIX_LENGTH))
    .join('');
  const checksumIndex = crc32(prefixes) % 24;
  words.push(words[checksumIndex]);

  return words;
}

// ─── Public API ───

export interface GeneratedWallet {
  seedPhrase: string;
  seedHex: string;
  address: string; // Primary address starting with '4' (95 chars)
  viewKey: string; // 64-char hex private view key
  spendKey: string; // 64-char hex private spend key
  publicSpendKey: string; // 64-char hex
  publicViewKey: string; // 64-char hex
}

/**
 * Generate a real Monero wallet in the browser.
 * Uses cryptographically secure random bytes → ed25519 key derivation →
 * proper CryptoNote base58 address encoding with valid checksums.
 */
export function generateBrowserWallet(): GeneratedWallet {
  // 1. Random 32 bytes → secret spend key (reduced mod l)
  const seedBytes = randomBytes(32);
  const spendKey = scReduce32(bytesToHex(seedBytes));

  // 2. Secret view key = keccak256(secret_spend_key) reduced mod l
  const viewKey = scReduce32(fastHash(spendKey));

  // 3. Public keys via ed25519 scalar multiplication
  const publicSpendKey = secretKeyToPublicKey(spendKey);
  const publicViewKey = secretKeyToPublicKey(viewKey);

  // 4. Primary address (mainnet, prefix 0x12 → starts with '4')
  const address = encodeAddress(
    MAINNET_ADDRESS_PREFIX,
    publicSpendKey,
    publicViewKey
  );

  // 5. 25-word mnemonic from the spend key
  const words = seedToMnemonic(spendKey);

  console.log('[WalletGen] Generated real Monero wallet');
  console.log('[WalletGen] Address:', address);
  console.log('[WalletGen] Address length:', address.length, 'starts with:', address[0]);

  return {
    seedPhrase: words.join(' '),
    seedHex: spendKey,
    address,
    viewKey,
    spendKey,
    publicSpendKey,
    publicViewKey,
  };
}

/**
 * Derive a Monero subaddress from wallet keys.
 * Uses the real CryptoNote subaddress derivation algorithm:
 *   D = B + hash("SubAddr\0" || view_key || account || index) * G
 *   C = D * view_key
 * Returns a 95-char address starting with '8' (mainnet subaddress).
 */
export function generateSubaddress(
  privateViewKeyHex: string,
  publicSpendKeyHex: string,
  accountIndex: number,
  subaddressIndex: number
): string {
  if (accountIndex === 0 && subaddressIndex === 0) {
    throw new Error('Index (0,0) is the primary address — use generateBrowserWallet().address');
  }

  // "SubAddr\0" + private_view_key + account_index_LE32 + subaddr_index_LE32
  const data =
    SUBADDR_PREFIX +
    privateViewKeyHex +
    intToLE32Hex(accountIndex) +
    intToLE32Hex(subaddressIndex);

  const m = hashToScalar(data); // scalar
  const M = ed.curve.g.mul(m); // M = m * G
  const B = ed.decodePoint(hexToBytes(publicSpendKeyHex)); // public spend key point
  const D = B.add(M); // subaddress public spend key

  const viewScalar = leHexToBN(privateViewKeyHex);
  const C = D.mul(viewScalar); // subaddress public view key

  const addr = encodeAddress(
    MAINNET_SUBADDRESS_PREFIX,
    pointToHex(D),
    pointToHex(C)
  );

  console.log(`[WalletGen] Subaddress [${accountIndex},${subaddressIndex}]:`, addr);
  console.log(`[WalletGen] Length: ${addr.length}, starts with: ${addr[0]}`);

  return addr;
}

/**
 * Validate a Monero address format (length + prefix check).
 */
export function isValidMoneroAddress(
  address: string
): { valid: boolean; type: 'primary' | 'subaddress' | 'integrated' | 'unknown' } {
  if (!address) return { valid: false, type: 'unknown' };

  const isBase58 = /^[1-9A-HJ-NP-Za-km-z]+$/.test(address);
  if (!isBase58) return { valid: false, type: 'unknown' };

  if (address.length === 95 && address.startsWith('4')) {
    return { valid: true, type: 'primary' };
  }
  if (address.length === 95 && address.startsWith('8')) {
    return { valid: true, type: 'subaddress' };
  }
  if (address.length === 106 && address.startsWith('4')) {
    return { valid: true, type: 'integrated' };
  }

  return { valid: false, type: 'unknown' };
}
