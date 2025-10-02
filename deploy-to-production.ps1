# DYSTOPIA Production Deployment Script (Windows PowerShell)
# Run this from your Windows PC

$SERVER_IP = "50.116.46.238"
$SERVER_USER = "root"
$DOMAIN = "dystopia.one"

Write-Host "=== DYSTOPIA Production Deployment ===" -ForegroundColor Green
Write-Host "Server: $SERVER_IP"
Write-Host "Domain: $DOMAIN"
Write-Host ""

# Check if SSH is available
try {
    ssh -V 2>$null
} catch {
    Write-Host "ERROR: SSH not found. Please install OpenSSH:" -ForegroundColor Red
    Write-Host "Settings -> Apps -> Optional Features -> Add OpenSSH Client"
    exit 1
}

Write-Host "[1/5] Uploading setup script to server..." -ForegroundColor Yellow
scp -o StrictHostKeyChecking=no setup-server.sh ${SERVER_USER}@${SERVER_IP}:/tmp/

Write-Host "[2/5] Running server setup (this takes 5-10 minutes)..." -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} "chmod +x /tmp/setup-server.sh && /tmp/setup-server.sh"

Write-Host "[3/5] Creating deployment package..." -ForegroundColor Yellow
# Create a zip file of the project
$exclude = @('node_modules', '.git', 'dist', '*.log', '.next', 'coverage')
Compress-Archive -Path client,server,shared,config.ts,configType.ts,package.json,pnpm-workspace.yaml,pnpm-lock.yaml,.env.development,dystopia-config.hjson -DestinationPath dystopia-deploy.zip -Force

Write-Host "[4/5] Uploading code to server..." -ForegroundColor Yellow
scp -o StrictHostKeyChecking=no dystopia-deploy.zip ${SERVER_USER}@${SERVER_IP}:/opt/dystopia/

Write-Host "[5/5] Deploying on server..." -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} @"
cd /opt/dystopia
unzip -o dystopia-deploy.zip
pnpm install
cd server && pnpm build && cd ..
cd client && pnpm build && cd ..
pm2 delete all || true
pm2 start server/dist/api/server.js --name dystopia-api
pm2 start server/dist/game/server.js --name dystopia-game
pm2 save
pm2 startup
"@

Write-Host ""
Write-Host "=== Deployment Complete! ===" -ForegroundColor Green
Write-Host "Next: Set up nginx and SSL (run the SSL setup script)"
Write-Host ""

# Cleanup
Remove-Item dystopia-deploy.zip
