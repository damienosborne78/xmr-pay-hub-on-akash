/**
 * TRX QR Code Generator
 * Generates QR codes in Tron URI format: tron:address?amount=X
 */

import { QRCodeSVG } from 'qrcode.react';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';

interface TrxQRCodeProps {
  address: string;
  amount: number;
  onCopy?: () => void;
}

export function TrxQRCode({ address, amount, onCopy }: TrxQRCodeProps) {
  // Tron URI format: tron:address?amount=X (amount in SUN)
  const amountSUN = Math.floor(amount * 1_000_000);
  const tronUri = `tron:${address}?amount=${amountSUN}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(tronUri);
    toast.success('TRX payment link copied!');
    onCopy?.();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* QR Code */}
      <div className="p-4 bg-white rounded-xl border-2 border-border">
        <QRCodeSVG
          value={tronUri}
          size={200}
          level="H"
          includeMargin={false}
        />
      </div>

      {/* Tron URI */}
      <div className="w-full max-w-[300px]">
        <div className="flex items-center gap-2 bg-background border border-border rounded-lg">
          <input
            readOnly
            value={tronUri}
            className="flex-1 bg-transparent px-3 py-2 text-xs font-mono text-foreground outline-none border-none"
          />
          <button
            onClick={handleCopy}
            className="px-3 py-2 border-l border-border hover:bg-accent transition-colors"
          >
            <Copy className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Address display */}
      <div className="text-center">
        <p className="text-[10px] text-muted-foreground mb-1">TRX Address</p>
        <p className="font-mono text-xs text-foreground break-all">{address}</p>
      </div>

      {/* Amount display */}
      <div className="text-center">
        <p className="text-[10px] text-muted-foreground mb-1">Amount</p>
        <p className="text-2xl font-bold text-foreground">{amount.toFixed(4)} TRX</p>
      </div>
    </div>
  );
}
