#!/bin/bash
# Keep the backend alive — run via CRON every 5 minutes
if ! pgrep -f "tsx src/index.ts" > /dev/null 2>&1; then
  cd ~/backend
  nohup npx tsx src/index.ts >> ~/backend.log 2>&1 &
  echo $! > ~/backend.pid
  echo "$(date) — Backend restarted (PID: $!)" >> ~/setup.log
fi
