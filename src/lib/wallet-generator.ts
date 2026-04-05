// Lightweight browser wallet generator
// Generates a realistic Monero-style wallet using browser crypto
// In production, this would use monero-ts keys-only WASM module

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

export interface GeneratedWallet {
  seedPhrase: string;
  address: string;
  viewKey: string;
}

export function generateBrowserWallet(): GeneratedWallet {
  const words = getRandomWords(25);
  const seedPhrase = words.join(' ');

  // Generate a realistic 95-char Monero address (starts with 4)
  const address = '4' + randomHex(94).slice(0, 94);

  // Generate a 64-char hex private view key
  const viewKey = randomHex(64);

  return { seedPhrase, address, viewKey };
}
