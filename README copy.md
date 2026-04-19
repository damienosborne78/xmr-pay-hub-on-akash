# XMR-Pay-Hub

A self-hosted Monero (XMR) payment processor for merchants. Deploy to Akash Network or run anywhere with Docker.

## Features

- **Accept Monero Payments** — Generate payment addresses and monitor incoming transactions
- **Merchant Dashboard** — View payments, manage wallets, track revenue
- **Cloud Backups** — Encrypt and backup your merchant data to Dropbox or Google Drive
- **View-Only Wallets** — Securely monitor wallets without exposing private keys
- **Self-Hosted** — Full control over your funds and data

## Quick Start

### Deploy to Akash

```bash
# Deploy using the included akash.yml
cat deploy.yml | akash tx deployment create --from $KEY_NAME --yes
```

### Run Locally with Docker

```bash
docker build -t xmr-pay-hub .
docker run -p 3000:3000 xmr-pay-hub
```

### Development

```bash
npm install
npm run dev
```

## Configuration

Set these environment variables:

| Variable | Description |
|----------|-------------|
| `MONERO_WALLET_RPC_URL` | Your monero-wallet-rpc endpoint |
| `MONERO_DAEMON_URL` | Monero daemon (e.g., localhost:18081) |
| `XMR_ADDRESS` | Your primary merchant XMR address |

## Security Notes

- Never commit private keys or seed phrases to version control
- Use view-only wallets for monitoring when possible
- Enable cloud backups with encryption for data safety
- Run behind a reverse proxy with TLS in production

## License

MIT License — see [LICENSE](LICENSE) for details.