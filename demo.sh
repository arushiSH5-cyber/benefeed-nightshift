#!/bin/zsh
# One command for the live demo: server + crew. Usage: ./demo.sh [browser|hosted]
#   browser = phone-sized browser on this Mac (works now)   hosted = PhoneUse cloud phone
cd "${0:A:h}"; set -a; . ./.env; set +a
export OWNER_TOKEN= PHONEUSE_MODE=${1:-browser} CREW_TASKS=${CREW_TASKS:-calfresh} BENEFEED_SERVER=http://127.0.0.1:8090 PYTHONUNBUFFERED=1 BROWSER_HEADLESS=${BROWSER_HEADLESS:-0}
(cd web && npm run build >/dev/null 2>&1)
pkill -f "uvicorn server.app"; pkill -f "runner.main"
uv run uvicorn server.app:app --port 8090 > /tmp/benefeed-server.log 2>&1 &
sleep 3
echo "Open http://localhost:8090/?demo and tap ▶ Watch it now"
uv run python -m runner.main
