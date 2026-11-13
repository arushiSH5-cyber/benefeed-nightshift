#!/bin/zsh
# One command for the live demo: server + crew. Usage: ./demo.sh [browser|hosted]
#   browser = phone-sized browser on this Mac (works now)   hosted = PhoneUse cloud phone
cd "${0:A:h}"; set -a; . ./.env; set +a
export PHONEUSE_MODE=${1:-browser} CREW_TASKS=${CREW_TASKS:-calfresh} BENEFEED_SERVER=http://127.0.0.1:8090 PYTHONUNBUFFERED=1 BROWSER_HEADLESS=${BROWSER_HEADLESS:-0}
(cd web && npm run build >/dev/null 2>&1)
pkill -f "uvicorn server.app"; pkill -f "runner.main"; pkill -f "cloudflared tunnel"
uv run uvicorn server.app:app --port 8090 > /tmp/benefeed-server.log 2>&1 &
sleep 3
echo "Your (owner) link: http://localhost:8090/?demo&owner=$OWNER_TOKEN"
cloudflared tunnel --url http://localhost:8090 --no-autoupdate > /tmp/benefeed-tunnel.log 2>&1 &
for i in {1..30}; do U=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' /tmp/benefeed-tunnel.log | head -1); [ -n "$U" ] && break; sleep 1; done
echo "\n📱 Public link for phones: $U/?demo"
echo "📱 YOUR phone (can start + approve): $U/?demo&owner=$OWNER_TOKEN\n"
command -v qrencode >/dev/null && qrencode -t ANSIUTF8 "$U/?demo"
uv run python -m runner.main
