/**
 * Monero Block Explorer Payment Verification
 * 
 * Uses public block explorer APIs (xmrchain.net) to verify payments
 * by scanning outputs with the merchant's view key + address.
 * 
 * This is the ONLY way to detect incoming payments for a view-only
 * browser wallet without running a full wallet RPC server.
 * 
 * Two verification modes:
 *   1. Auto-scan: Poll recent blocks + mempool for outputs to our subaddress
 *   2. TX verify: Given a TX hash, check if any outputs belong to us
 */

// Multiple explorer endpoints for failover
const EXPLORER_ENDPOINTS = [
  'https://xmrchain.net',
  'https://explore.moneroworld.com',
];

export interface ExplorerOutput {
  amount: number;        // atomic units (piconero)
  match: boolean;        // true if output belongs to our address
  output_idx: number;
  output_pubkey: string;
}

export interface ExplorerTxResult {
  tx_hash: string;
  tx_fee: number;
  outputs: ExplorerOutput[];
  block_no: number;       // 0 if in mempool
  confirmations: number;
  timestamp: number;
  coinbase: boolean;
}

export interface OutputsBlocksResult {
  address: string;
  height: number;
  mempool: boolean;
  outputs: Array<{
    amount: number;
    block_no: number;
    in_mempool: boolean;
    output_idx: number;
    output_pubkey: string;
    payment_id: string;
    tx_hash: string;
  }>;
}

/**
 * Check if a specific TX has outputs belonging to the given address + viewkey.
 * Uses: /api/outputs?txhash=X&address=X&viewkey=X&txprove=0
 */
export async function verifyTxOutputs(
  txHash: string,
  address: string,
  viewKey: string,
): Promise<{ matched: boolean; totalAmount: number; confirmations: number; txFee: number } | null> {
  for (const baseUrl of EXPLORER_ENDPOINTS) {
    try {
      const url = `${baseUrl}/api/outputs?txhash=${txHash}&address=${address}&viewkey=${viewKey}&txprove=0`;
      console.log(`[Explorer] Checking TX outputs: ${baseUrl}`);
      
      const resp = await fetch(url, { 
        signal: AbortSignal.timeout(15000),
      });
      
      if (!resp.ok) {
        console.warn(`[Explorer] ${baseUrl} returned ${resp.status}`);
        continue;
      }
      
      const data = await resp.json();
      
      if (data.status === 'fail' || data.status === 'error') {
        console.warn(`[Explorer] API error:`, data.data);
        continue;
      }
      
      const result = data.data;
      const matchedOutputs = (result.outputs || []).filter((o: any) => o.match === true);
      const totalAmount = matchedOutputs.reduce((sum: number, o: any) => sum + (o.amount || 0), 0);
      
      return {
        matched: matchedOutputs.length > 0,
        totalAmount,
        confirmations: result.confirmations ?? 0,
        txFee: result.tx_fee ?? 0,
      };
    } catch (e) {
      console.warn(`[Explorer] ${baseUrl} failed:`, e);
      continue;
    }
  }
  return null;
}

/**
 * Scan recent blocks + mempool for outputs to our address.
 * Uses: /api/outputsblocks?address=X&viewkey=X&limit=5&mempool=1
 * 
 * Returns matched outputs with TX hashes and amounts.
 */
export async function scanRecentOutputs(
  address: string,
  viewKey: string,
  limit: number = 5,
  includeMempool: boolean = true,
): Promise<Array<{
  txHash: string;
  amount: number;
  blockNo: number;
  inMempool: boolean;
  confirmations: number;
}>> {
  for (const baseUrl of EXPLORER_ENDPOINTS) {
    try {
      const url = `${baseUrl}/api/outputsblocks?address=${address}&viewkey=${viewKey}&limit=${limit}&mempool=${includeMempool ? 1 : 0}`;
      console.log(`[Explorer] Scanning recent outputs: ${baseUrl}`);
      
      const resp = await fetch(url, {
        signal: AbortSignal.timeout(20000),
      });
      
      if (!resp.ok) {
        console.warn(`[Explorer] ${baseUrl} returned ${resp.status}`);
        continue;
      }
      
      const data = await resp.json();
      
      if (data.status === 'fail' || data.status === 'error') {
        console.warn(`[Explorer] API error:`, data.data);
        continue;
      }
      
      const result = data.data;
      const currentHeight = result.height || 0;
      
      return (result.outputs || []).map((o: any) => ({
        txHash: o.tx_hash,
        amount: o.amount,
        blockNo: o.block_no || 0,
        inMempool: !!o.in_mempool,
        confirmations: o.block_no > 0 && currentHeight > 0 
          ? Math.max(0, currentHeight - o.block_no + 1) 
          : 0,
      }));
    } catch (e) {
      console.warn(`[Explorer] ${baseUrl} scan failed:`, e);
      continue;
    }
  }
  return [];
}

/**
 * Get basic TX info from explorer (no viewkey needed).
 * Uses: /api/transaction/TXHASH
 */
export async function getTxInfo(txHash: string): Promise<{
  confirmed: boolean;
  confirmations: number;
  blockHeight: number;
  fee: number;
  timestamp: number;
} | null> {
  for (const baseUrl of EXPLORER_ENDPOINTS) {
    try {
      const url = `${baseUrl}/api/transaction/${txHash}`;
      console.log(`[Explorer] Getting TX info: ${baseUrl}`);
      
      const resp = await fetch(url, {
        signal: AbortSignal.timeout(15000),
      });
      
      if (!resp.ok) continue;
      
      const data = await resp.json();
      if (data.status === 'fail') continue;
      
      const tx = data.data;
      return {
        confirmed: tx.block_height > 0,
        confirmations: tx.confirmations ?? 0,
        blockHeight: tx.block_height ?? 0,
        fee: tx.tx_fee ?? 0,
        timestamp: tx.timestamp ?? 0,
      };
    } catch (e) {
      console.warn(`[Explorer] ${baseUrl} TX info failed:`, e);
      continue;
    }
  }
  return null;
}

/**
 * Check if explorer APIs are reachable (for UI status indicator).
 */
export async function checkExplorerHealth(): Promise<{ available: boolean; endpoint: string }> {
  for (const baseUrl of EXPLORER_ENDPOINTS) {
    try {
      const resp = await fetch(`${baseUrl}/api/networkinfo`, {
        signal: AbortSignal.timeout(8000),
      });
      if (resp.ok) {
        return { available: true, endpoint: baseUrl };
      }
    } catch {
      continue;
    }
  }
  return { available: false, endpoint: '' };
}
