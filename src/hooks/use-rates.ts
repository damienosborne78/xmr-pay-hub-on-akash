import { useState, useEffect, useCallback } from 'react';
import { getRates, getStaleCache } from '@/lib/currency-service';

type CachedRates = Awaited<ReturnType<typeof getRates>>;

export function useRates() {
  const [rates, setRates] = useState<CachedRates | null>(() => getStaleCache());
  const [loading, setLoading] = useState(!rates);

  const refresh = useCallback(async () => {
    try {
      // Force fresh fetch by clearing cache
      localStorage.removeItem('moneroflow_currency_cache');
      const r = await getRates();
      setRates(r);
    } catch {
      // Keep stale rates if refresh fails
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    getRates()
      .then(r => { if (mounted) { setRates(r); setLoading(false); } })
      .catch(() => { if (mounted) setLoading(false); });

    // Auto-refresh every 5 min
    const interval = setInterval(() => {
      getRates().then(r => { if (mounted) setRates(r); }).catch(() => {});
    }, 5 * 60 * 1000);

    return () => { mounted = false; clearInterval(interval); };
  }, []);

  return { rates, loading, refresh };
}
