# Agent Notes

## Deployment & Testing

**Active Testing Container:**
- Runs on port **8090**
- This is where all manual testing occurs
- Any code changes require rebuild to see effects

**Build Requirements:**
- Minimum flag: `--no-cache` (e.g., `npm run build --no-cache` or `npx vite build --no-cache`)
- Docker Compose rebuild: `docker-compose up -d --build`
- Never use cached builds when testing bug fixes or UI changes

**Quick Deploy Workflow:**
```bash
# 1. Build frontend
cd /home/damo-admin/testing/xmr-pay-hub-on-akash
npm run build --no-cache

# 2. Rebuild and restart container
docker-compose up -d --build

# 3. Verify on testing port
curl http://localhost:8090
# Or browser: http://localhost:8090
```

**Container Info:**
- Container name: `xmr-pay-hub`
- Service in docker-compose: `app`
- Maps to port 8090 (nginx listens on 80, docker maps to 8090)

**Project Paths:**
- **Active project:** `/home/damo-admin/testing/xmr-pay-hub-on-akash`
- **DEPRECATED - DO NOT USE:** 
  - `/home/node/.openclaw/workspace/moneroflow`
  - `/home/node/.openclaw/workspace/moneroflow/backend`
  - Container: `moneroflow-backend-1` (old, removed)
