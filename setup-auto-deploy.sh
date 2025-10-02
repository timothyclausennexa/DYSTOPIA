#!/bin/bash
# DYSTOPIA - Setup Auto-Deploy on Server
# Run this ONCE on your Linode server to enable auto-updates

echo "==================================="
echo "  DYSTOPIA Auto-Deploy Setup"
echo "==================================="
echo ""

# 1. Set up auto-pull every hour
echo "[1/4] Setting up hourly auto-pull..."
cat > /opt/dystopia/auto-update.sh << 'EOF'
#!/bin/bash
cd /opt/dystopia
git fetch origin master
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/master)

if [ "$LOCAL" != "$REMOTE" ]; then
    echo "New updates found! Deploying..."
    git pull origin master
    pnpm install
    cd client && pnpm build && cd ..
    cd server && pnpm build && cd ..
    pm2 restart all
    echo "Auto-deploy complete at $(date)" >> /var/log/dystopia-autodeploy.log
else
    echo "No updates needed at $(date)"
fi
EOF

chmod +x /opt/dystopia/auto-update.sh

# 2. Add to crontab (runs every hour)
echo "[2/4] Adding cron job..."
(crontab -l 2>/dev/null; echo "0 * * * * /opt/dystopia/auto-update.sh >> /var/log/dystopia-autodeploy.log 2>&1") | crontab -

# 3. Set up webhook listener (optional)
echo "[3/4] Installing webhook listener..."
npm install -g github-webhook-handler pm2

cat > /opt/dystopia/webhook-server.js << 'EOF'
const http = require('http');
const createHandler = require('github-webhook-handler');
const { exec } = require('child_process');

const handler = createHandler({ path: '/webhook', secret: 'dystopia-secret-key' });

http.createServer((req, res) => {
  handler(req, res, (err) => {
    res.statusCode = 404;
    res.end('no such location');
  });
}).listen(7777);

handler.on('error', (err) => {
  console.error('Error:', err.message);
});

handler.on('push', (event) => {
  console.log('Received a push event for %s to %s',
    event.payload.repository.name,
    event.payload.ref);

  if (event.payload.ref === 'refs/heads/master') {
    console.log('Deploying...');
    exec('/opt/dystopia/auto-update.sh', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error}`);
        return;
      }
      console.log(`Output: ${stdout}`);
      if (stderr) console.error(`Stderr: ${stderr}`);
    });
  }
});

console.log('Webhook server listening on port 7777');
EOF

# 4. Start webhook server with PM2
echo "[4/4] Starting webhook server..."
pm2 start /opt/dystopia/webhook-server.js --name dystopia-webhook
pm2 save

echo ""
echo "==================================="
echo "  ✓ Auto-Deploy Setup Complete!"
echo "==================================="
echo ""
echo "Auto-updates enabled:"
echo "  - Checks for updates every hour"
echo "  - Webhook listener on port 7777"
echo "  - Logs: /var/log/dystopia-autodeploy.log"
echo ""
echo "Next steps:"
echo "1. Add GitHub webhook:"
echo "   - Go to: https://github.com/timothyclausennexa/DYSTOPIA/settings/hooks"
echo "   - Add webhook: http://50.116.46.238:7777/webhook"
echo "   - Secret: dystopia-secret-key"
echo "   - Events: Just the push event"
echo ""
echo "2. Open firewall port 7777:"
echo "   ufw allow 7777"
echo ""
echo "Now every time you push to GitHub, it auto-deploys!"
echo ""
