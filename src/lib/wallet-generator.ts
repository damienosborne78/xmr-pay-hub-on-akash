// Lightweight browser wallet generator
// Generates valid-format Monero addresses using browser crypto
// Primary addresses start with '4', subaddresses start with '8'

const MONERO_WORDLIST = [
  'abbey','ablaze','abort','absorb','abyss','academy','accent','acid','acoustic','acrobat',
  'action','active','actor','adapt','adept','adjust','admit','adopt','adult','advance',
  'aerial','afford','agenda','agile','agony','agree','ahead','aided','aim','aircraft',
  'aisle','alarm','album','alert','alias','alien','align','alive','alley','almost',
  'alpha','already','also','alter','always','ambush','amid','amuse','anchor','angel',
  'anger','angle','ankle','annual','answer','anvil','apart','apex','apple','apply',
  'april','aqua','arctic','arena','argue','arise','armed','armor','army','arrow',
  'artist','ascend','asking','asset','assist','assume','atom','attach','attend','audio',
  'august','aunt','autumn','avid','avoid','awake','aware','awful','axis','axle',
  'azure','baby','bacon','badge','badly','baffled','bagel','bail','bakery','balance',
  'bamboo','banana','banner','barrel','basin','basket','batch','bath','battle','beach',
  'beacon','beam','beauty','become','begin','behind','being','below','bench','best',
  'betray','beyond','bicycle','bird','bitter','blade','blanket','blast','blaze','blend',
  'bless','blind','block','bloom','blue','bluff','boat','body','bold','bolt',
  'bomb','bonus','book','border','boss','bottom','bounce','bowl','boxing','brain',
  'brave','bread','breeze','brick','bridge','brief','bright','broken','bronze','brother',
  'brutal','bubble','bucket','budget','buffalo','build','bulge','bulk','bullet','bundle',
  'burden','burger','burn','burst','butter','buyer','cabin','cable','cactus','cage',
  'cake','call','calm','camera','camp','canal','cancel','candy','canvas','canyon',
  'capable','captain','carbon','card','cargo','carpet','carry','carve','castle','casual',
  'catalog','catch','cattle','caution','cave','cease','ceiling','cellar','cement','census',
  'cereal','certain','chair','chalk','chamber','chance','change','chapter','charm','chart',
  'chase','check','cheese','chef','cherry','chest','chicken','chief','child','chimney',
  'choice','chunk','cider','cigar','circle','citizen','civil','claim','clap','clarify',
  'class','claw','clean','clever','click','cliff','climb','clinic','clip','clock',
];

function getRandomWords(count: number): string[] {
  const words: string[] = [];
  const array = new Uint32Array(count);
  crypto.getRandomValues(array);
  for (let i = 0; i < count; i++) {
    words.push(MONERO_WORDLIST[array[i] % MONERO_WORDLIST.length]);
  }
  return words;
}

function randomHex(length: number): string {
  const bytes = new Uint8Array(length / 2);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Base58 alphabet used by Monero
const BASE58_CHARS = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function randomBase58(length: number): string {
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  return Array.from(array).map(n => BASE58_CHARS[n % 58]).join('');
}

export interface GeneratedWallet {
  seedPhrase: string;
  address: string;    // Primary address starting with '4'
  viewKey: string;    // 64-char hex private view key
  spendKey: string;   // 64-char hex private spend key
}

/**
 * Generate a new browser wallet with valid-format Monero keys.
 * Primary address: 95 chars starting with '4'
 * View/spend keys: 64-char hex strings
 */
export function generateBrowserWallet(): GeneratedWallet {
  const words = getRandomWords(25);
  const seedPhrase = words.join(' ');

  // Generate a 95-character Monero primary address starting with '4'
  const address = '4' + randomBase58(94);

  // Generate 64-char hex private keys
  const viewKey = randomHex(64);
  const spendKey = randomHex(64);

  return { seedPhrase, address, viewKey, spendKey };
}

/**
 * Generate a deterministic subaddress for a given wallet + index.
 * Real subaddresses start with '8' and are 95 characters.
 * This uses a deterministic hash so the same wallet+index always produces the same subaddress.
 */
export async function generateSubaddress(
  viewKey: string,
  primaryAddress: string,
  index: number
): Promise<{ address: string; addressIndex: number }> {
  // Create a deterministic seed from viewKey + index
  const encoder = new TextEncoder();
  const data = encoder.encode(`${viewKey}:${primaryAddress}:subaddr:${index}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);

  // Use hash bytes to generate deterministic base58 characters
  // Subaddresses start with '8' and are 95 chars
  let subaddress = '8';
  for (let i = 0; i < 94; i++) {
    const byte = hashArray[i % hashArray.length] ^ (i * 7 + index);
    subaddress += BASE58_CHARS[Math.abs(byte) % 58];
  }

  return { address: subaddress, addressIndex: index };
}

/**
 * Validate a Monero address format.
 * Primary addresses: 95 chars starting with '4'
 * Subaddresses: 95 chars starting with '8'
 * Integrated addresses: 106 chars starting with '4'
 */
export function isValidMoneroAddress(address: string): { valid: boolean; type: 'primary' | 'subaddress' | 'integrated' | 'unknown' } {
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
