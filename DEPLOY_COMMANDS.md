# DYSTOPIA Production Deployment Guide

## Server Details
- IP: 50.116.46.238
- Domain: dystopia.one
- Password: Stl2019Stl!!

## Step 1: Connect to Server
```bash
ssh root@50.116.46.238
```
Password: Stl2019Stl!!

## Step 2: Install Dependencies (on server)
```bash
# Update system
apt-get update && apt-get upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install pnpm
npm install -g pnpm

# Install PostgreSQL
apt-get install -y postgresql postgresql-contrib

# Install other tools
apt-get install -y git nginx certbot python3-certbot-nginx ufw

# Install PM2
npm install -g pm2

# Configure firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8000/tcp
ufw allow 8001/tcp
ufw --force enable
```

## Step 3: Set up PostgreSQL
```bash
# Start PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE dystopia;
CREATE USER dystopia WITH PASSWORD 'Stl2019Stl!';
GRANT ALL PRIVILEGES ON DATABASE dystopia TO dystopia;
\q
EOF
```

## Step 4: Upload Code (from your Windows PC)
You'll need to use WinSCP or Git to upload the code.

Option A: Using Git (recommended)
```bash
# On server
cd /opt
git clone https://github.com/yourusername/DYSTOPIA.git
# OR upload via SCP/WinSCP
```

Option B: I'll provide commands to package and upload

## Step 5: Configure Environment
```bash
cd /opt/DYSTOPIA

# Create production config
cat > dystopia-config.hjson << 'EOF'
{
  apiServer: {
    host: "0.0.0.0"
    port: 8000
  }
  gameServer: {
    host: "0.0.0.0"
    port: 8001
    apiServerUrl: "http://localhost:8000"
    thisRegion: "us-southeast"
  }
  vite: {
    host: "dystopia.one"
    port: 3000
  }
  regions: {
    "us-southeast": {
      https: true
      address: "dystopia.one:8001"
      l10n: "index-us-southeast"
    }
  }
  database: {
    enabled: true
    host: "127.0.0.1"
    user: "dystopia"
    password: "Stl2019Stl!"
    database: "dystopia"
    port: 5432
  }
  oauthRedirectURI: "https://dystopia.one"
  secrets: {
    DYSTOPIA_ETERNAL_API_KEY: "GGzsJNQQl83TIPYrPh3gLlPPUxwlc20q26BwZSrALVUZZbfBfwpt45JagBa2eJurozOW8Wvk3K2kNIXbmxWEvA=="
    DYSTOPIA_ETERNAL_LOADOUT_SECRET: "KAR2CSwRklkNru8IMdHfgox5qpve27CpHTva1nijZ2E="
    DYSTOPIA_ETERNAL_IP_SECRET: "AyACf1+juiGTPN67Jgo23UrA1kd/fI0kq7/BBThDguk="
  }
  rateLimitsEnabled: true
  processMode: "multi"
}
EOF

# Copy .env.development
cat > .env.development << 'EOF'
SUPABASE_URL='https://rplglfwwyavfkpvczkkj.supabase.co'
SUPABASE_SERVICE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwbGdsZnd3eWF2ZmtwdmN6a2tqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDI0MTk5OSwiZXhwIjoyMDU5ODE3OTk5fQ.TYr9zNTPfWLJdHTxHZW_hAJh7e4QPDFOr7IG0UR1tws'
SUPABASE_ACCESS_TOKEN='sbp_2ca1f2a407294f29509ca049b13bd6702ce2890b'
DATABASE_URL='postgresql://postgres.rplglfwwyavfkpvczkkj:Stl2019Stl!@aws-0-us-east-1.pooler.supabase.com:5432/postgres'
EOF
```

## Step 6: Build and Install
```bash
# Install dependencies
pnpm install

# Build server
cd server
pnpm build
cd ..

# Build client
cd client
pnpm build
cd ..
```

## Step 7: Set up Nginx
```bash
cat > /etc/nginx/sites-available/dystopia << 'EOF'
server {
    listen 80;
    server_name dystopia.one www.dystopia.one;

    # Client files
    location / {
        root /opt/DYSTOPIA/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # API server
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Game server WebSocket
    location /socket.io {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

ln -s /etc/nginx/sites-available/dystopia /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

## Step 8: Set up SSL
```bash
certbot --nginx -d dystopia.one -d www.dystopia.one --non-interactive --agree-tos --email your@email.com
```

## Step 9: Start Services with PM2
```bash
cd /opt/DYSTOPIA

# Start API server
pm2 start server/dist/api/server.js --name dystopia-api

# Start Game server
pm2 start server/dist/game/server.js --name dystopia-game

# Save PM2 config
pm2 save

# Set PM2 to start on boot
pm2 startup
# Run the command it outputs
```

## Step 10: Verify
```bash
pm2 status
curl http://localhost:8000/health
curl http://localhost:8001/health
```

## Done!
Visit: https://dystopia.one
