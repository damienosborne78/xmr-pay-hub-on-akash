/**
 * Monero Wallet RPC Client (Mock Implementation)
 * 
 * In production, these calls would go through server-side API routes
 * to avoid exposing RPC credentials. This mock simulates the full
 * monero-wallet-rpc JSON-RPC interface.
 */

import { generateSubaddress } from './mock-data';

export interface RpcConfig {
  endpoint: string;
  username: string;
  password: string;
  walletFilename: string;
}

export interface RpcBalance {
  balance: number;          // atomic units (piconero)
  unlockedBalance: number;
  multisigImportNeeded: boolean;
}

export interface RpcSubaddress {
  address: string;
  addressIndex: number;
  label: string;
  used: boolean;
}

export interface RpcTransfer {
  txid: string;
  amount: number;
  confirmations: number;
  height: number;
  timestamp: number;
  subaddrIndex: { major: number; minor: number };
  type: 'in' | 'out' | 'pending';
  address: string;
  fee: number;
  note: string;
}

export interface NodeHealth {
  connected: boolean;
  syncHeight: number;
  targetHeight: number;
  syncPercent: number;
  networkType: 'mainnet' | 'stagenet' | 'testnet';
  version: string;
  uptime: number; // seconds
  status: 'synced' | 'syncing' | 'offline';
}

// Simulated latency
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

let mockSubaddrIndex = 10;

/**
 * Mock RPC call that simulates the JSON-RPC interface.
 * In production: fetch(`${config.endpoint}/json_rpc`, { method, params })
 */
async function mockRpcCall<T>(method: string, _params?: Record<string, unknown>): Promise<T> {
  await delay(200 + Math.random() * 300);

  switch (method) {
    case 'get_balance':
      return {
        balance: 5432100000000,
        unlockedBalance: 4981200000000,
        multisigImportNeeded: false,
      } as T;

    case 'create_address': {
      mockSubaddrIndex++;
      return {
        address: generateSubaddress(),
        addressIndex: mockSubaddrIndex,
        label: (_params?.label as string) || '',
        used: false,
      } as T;
    }

    case 'get_address':
      return {
        address: generateSubaddress(),
        addresses: Array.from({ length: 5 }, (_, i) => ({
          address: generateSubaddress(),
          addressIndex: i,
          label: i === 0 ? 'Primary' : `Invoice #${i}`,
          used: i < 3,
        })),
      } as T;

    case 'get_transfers': {
      const transfers: RpcTransfer[] = [
        {
          txid: 'a'.repeat(64).replace(/a/g, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]),
          amount: 298500000000,
          confirmations: 14,
          height: 3120456,
          timestamp: Date.now() / 1000 - 3600,
          subaddrIndex: { major: 0, minor: 2 },
          type: 'in',
          address: generateSubaddress(),
          fee: 0,
          note: '',
        },
        {
          txid: 'b'.repeat(64).replace(/b/g, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]),
          amount: 149250000000,
          confirmations: 8,
          height: 3120460,
          timestamp: Date.now() / 1000 - 1800,
          subaddrIndex: { major: 0, minor: 3 },
          type: 'in',
          address: generateSubaddress(),
          fee: 0,
          note: '',
        },
      ];
      return { in: transfers, out: [], pending: [] } as T;
    }

    case 'transfer':
      return {
        txid: 'c'.repeat(64).replace(/c/g, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]),
        amount: (_params?.amount as number) || 0,
        fee: 7800000,
        multisigTxset: '',
        txBlob: '',
        txKey: 'd'.repeat(64).replace(/d/g, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]),
      } as T;

    case 'get_tx_key':
      return {
        txKey: 'e'.repeat(64).replace(/e/g, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]),
      } as T;

    case 'get_version':
      return { version: 196621 } as T; // v0.18.3.3

    default:
      throw new Error(`Unknown RPC method: ${method}`);
  }
}

// ─── Public API ───

export async function testConnection(config: RpcConfig): Promise<{ success: boolean; balance?: RpcBalance; error?: string }> {
  try {
    if (!config.endpoint) throw new Error('RPC endpoint is required');
    const balance = await mockRpcCall<RpcBalance>('get_balance');
    return { success: true, balance };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function createSubaddress(config: RpcConfig, label: string): Promise<RpcSubaddress> {
  return mockRpcCall<RpcSubaddress>('create_address', { account_index: 0, label });
}

export async function getBalance(config: RpcConfig): Promise<RpcBalance> {
  return mockRpcCall<RpcBalance>('get_balance');
}

export async function getTransfers(config: RpcConfig, subaddrIndices?: number[]): Promise<{ in: RpcTransfer[]; out: RpcTransfer[]; pending: RpcTransfer[] }> {
  return mockRpcCall('get_transfers', {
    in: true, out: true, pending: true,
    filter_by_subaddr_indices: subaddrIndices,
  });
}

export async function sweepToAddress(config: RpcConfig, address: string, amount: number): Promise<{ txid: string; fee: number; txKey: string }> {
  const result = await mockRpcCall<{ txid: string; fee: number; txKey: string }>('transfer', {
    destinations: [{ amount, address }],
  });
  return result;
}

export async function getTxKey(config: RpcConfig, txid: string): Promise<string> {
  const result = await mockRpcCall<{ txKey: string }>('get_tx_key', { txid });
  return result.txKey;
}

export async function getNodeHealth(_config: RpcConfig): Promise<NodeHealth> {
  await delay(150);
  const targetHeight = 3120500;
  const syncHeight = targetHeight - Math.floor(Math.random() * 3);
  return {
    connected: true,
    syncHeight,
    targetHeight,
    syncPercent: Math.min(100, (syncHeight / targetHeight) * 100),
    networkType: 'mainnet',
    version: '0.18.3.3',
    uptime: 86400 * 3 + 7200 + 1423,
    status: syncHeight >= targetHeight - 1 ? 'synced' : 'syncing',
  };
}

// Convert atomic units (piconero) to XMR
export const piconeroToXmr = (pico: number) => pico / 1e12;
export const xmrToPiconero = (xmr: number) => Math.round(xmr * 1e12);
