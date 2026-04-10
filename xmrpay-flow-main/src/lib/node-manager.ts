/**
 * Remote Node Manager
 * Handles auto-connection, health checking, and failover for Monero remote nodes.
 */

export interface RemoteNode {
  label: string;
  url: string;
  ssl: boolean;
}

export const REMOTE_NODES: RemoteNode[] = [
  { label: 'Seth for Privacy', url: 'node.sethforprivacy.com:18089', ssl: true },
  { label: 'Cake Wallet', url: 'xmr-node.cakewallet.com:18081', ssl: true },
  { label: 'HashVault', url: 'nodes.hashvault.pro:18081', ssl: true },
  { label: 'RINO Community', url: 'node.community.rino.io:18081', ssl: true },
  { label: 'MoneroWorld', url: 'node.moneroworld.com:18089', ssl: true },
];

export interface NodeStatus {
  connected: boolean;
  label: string;
  url: string;
  height: number;
  targetHeight: number;
  syncPercent: number;
  latencyMs: number;
  status: 'online' | 'syncing' | 'offline' | 'connecting';
  lastChecked: number;
  error?: string;
}

const DEFAULT_STATUS: NodeStatus = {
  connected: false,
  label: '',
  url: '',
  height: 0,
  targetHeight: 0,
  syncPercent: 0,
  latencyMs: 0,
  status: 'offline',
  lastChecked: 0,
};

/**
 * Test a single remote node and return its status.
 * Uses a timeout to prevent hanging on unresponsive nodes.
 */
export async function testNode(node: RemoteNode, timeoutMs = 8000): Promise<NodeStatus> {
  const startTime = Date.now();
  const protocol = node.ssl ? 'https' : 'http';
  const url = `${protocol}://${node.url}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(`${url}/json_rpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: '1',
        method: 'get_info',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      return { ...DEFAULT_STATUS, label: node.label, url: node.url, error: `HTTP ${response.status}`, lastChecked: Date.now() };
    }

    const data = await response.json();
    if (data.error) {
      return { ...DEFAULT_STATUS, label: node.label, url: node.url, error: data.error.message, lastChecked: Date.now() };
    }

    const result = data.result;
    const height = result?.height || 0;
    const targetHeight = result?.target_height || height;
    const syncPercent = targetHeight > 0 ? Math.min(100, (height / targetHeight) * 100) : 100;

    return {
      connected: true,
      label: node.label,
      url: node.url,
      height,
      targetHeight,
      syncPercent,
      latencyMs,
      status: syncPercent >= 99.9 ? 'online' : 'syncing',
      lastChecked: Date.now(),
    };
  } catch (e) {
    return {
      ...DEFAULT_STATUS,
      label: node.label,
      url: node.url,
      latencyMs: Date.now() - startTime,
      error: (e as Error).message?.includes('abort') ? 'Timeout' : (e as Error).message,
      lastChecked: Date.now(),
    };
  }
}

/**
 * Find the fastest responding node from the list.
 * Tests all nodes in parallel and returns the best one.
 */
export async function findFastestNode(nodes: RemoteNode[] = REMOTE_NODES): Promise<{ node: RemoteNode; status: NodeStatus } | null> {
  const results = await Promise.all(nodes.map(async (node) => {
    const status = await testNode(node, 6000);
    return { node, status };
  }));

  // Filter to connected nodes, sort by latency
  const connected = results
    .filter(r => r.status.connected)
    .sort((a, b) => a.status.latencyMs - b.status.latencyMs);

  return connected[0] || null;
}

/**
 * Try to connect to nodes in order, returning the first successful one.
 * Used for failover when current node goes down.
 */
export async function connectWithFailover(
  nodes: RemoteNode[] = REMOTE_NODES,
  excludeUrl?: string
): Promise<{ node: RemoteNode; status: NodeStatus } | null> {
  const candidates = excludeUrl ? nodes.filter(n => n.url !== excludeUrl) : nodes;

  for (const node of candidates) {
    const status = await testNode(node, 5000);
    if (status.connected) {
      return { node, status };
    }
  }
  return null;
}
