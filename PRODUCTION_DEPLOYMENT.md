# 🔥 DYSTOPIA: ETERNAL BATTLEGROUND - Production Deployment Guide

Complete guide for deploying DYSTOPIA to production with 24/7 uptime, auto-scaling, monitoring, and automated maintenance.

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [PM2 Deployment](#pm2-deployment)
3. [Docker Deployment](#docker-deployment)
4. [Monitoring & Health Checks](#monitoring--health-checks)
5. [Automated Maintenance](#automated-maintenance)
6. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- pnpm (package manager)
- PM2 (process manager)
- Redis (caching & job queues)
- Nginx (reverse proxy)
- Supabase account (database)

### Environment Setup

1. **Create production environment file:**

```bash
cp .env.example .env.production
```

2. **Configure environment variables:**

```env
NODE_ENV=production
PORT=3000

# Supabase
SUPABASE_URL=https://rplglfwwyavfkpvczkkj.supabase.co
SUPABASE_SERVICE_KEY=your_service_key

# Redis
REDIS_URL=redis://localhost:6379

# Discord Alerts (optional)
DISCORD_WEBHOOK=https://discord.com/api/webhooks/...
```

3. **Install dependencies:**

```bash
pnpm install
```

4. **Build project:**

```bash
pnpm build
```

---

## 🔧 PM2 Deployment

### Installation

```bash
# Install PM2 globally
npm install -g pm2

# Install PM2 startup script
pm2 startup
```

### Deploy with PM2

```bash
# Run deployment script
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### Manual PM2 Commands

```bash
# Start all services
pm2 start ecosystem.config.js --env production

# View status
pm2 status

# View logs
pm2 logs dystopia-game-server

# Monitor in real-time
pm2 monit

# Restart all
pm2 restart all

# Stop all
pm2 stop all

# Save configuration
pm2 save

# Delete all processes
pm2 delete all
```

### PM2 Configuration

The `ecosystem.config.js` file configures:

- **Main Game Server**: 4 clustered instances on port 3000
- **Zone Server 1**: Zones 0-24 on port 3001
- **Zone Server 2**: Zones 25-49 on port 3002
- **Zone Server 3**: Zones 50-74 on port 3003
- **Zone Server 4**: Zones 75-99 on port 3004

**Features:**
- Auto-restart on crash (max 10 restarts)
- Memory limit: 2GB per instance
- Graceful shutdown with 5s timeout
- Clustered mode for load balancing
- Separate log files per service

---

## 🐳 Docker Deployment

### Build and Run

```bash
# Build Docker image
docker build -t dystopia-eternal:latest .

# Run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f game-server

# Stop all services
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

### Docker Stack Includes

1. **Nginx** - Reverse proxy & load balancer (ports 80, 443)
2. **Game Server** - Node.js game server (ports 3000-3003)
3. **Redis** - Caching & job queues (port 6379)
4. **Prometheus** - Metrics collection (port 9090)
5. **Grafana** - Monitoring dashboard (port 3030)

### Docker Commands

```bash
# View running containers
docker ps

# View game server logs
docker logs dystopia-game-server

# Restart game server
docker restart dystopia-game-server

# Execute command in container
docker exec -it dystopia-game-server pm2 status

# Clean up old images
docker system prune -a
```

---

## 📊 Monitoring & Health Checks

### Health Monitor System

The built-in health monitoring system (`server/src/monitoring/health.ts`) provides:

- **Health checks every 30 seconds**
- **Detailed metrics every 5 minutes**
- **Automated cleanup every hour**
- **Discord alerts for critical issues**
- **Database connection monitoring**
- **Redis connection monitoring**
- **Memory usage tracking**
- **Zone status tracking**

### Health Endpoints

```bash
# Check server health
curl http://localhost:3000/health

# Get detailed health report (if exposed)
curl http://localhost:3000/api/health/report
```

### Auto-Restart Monitor

The `scripts/monitor.sh` script continuously monitors the server and automatically restarts if:

- Server stops responding (3 consecutive failures)
- Memory usage exceeds 2GB
- Health check fails

**Run monitor in background:**

```bash
chmod +x scripts/monitor.sh
nohup ./scripts/monitor.sh > logs/monitor.log 2>&1 &
```

### Prometheus Metrics

Access Prometheus dashboard:

```
http://localhost:9090
```

**Available metrics:**
- HTTP request rates
- WebSocket connections
- Memory usage
- CPU usage
- Database query performance

### Grafana Dashboard

Access Grafana dashboard:

```
http://localhost:3030
```

**Default credentials:**
- Username: `admin`
- Password: `dystopia2025`

---

## 🔧 Automated Maintenance

### Cron Jobs Setup

Install all automated tasks:

```bash
chmod +x scripts/setup-cron.sh
./scripts/setup-cron.sh
```

### Scheduled Tasks

1. **Daily Maintenance** (4:00 AM)
   - Server restart
   - Database cleanup
   - Log rotation
   - Build cleanup

2. **Database Backup** (Every 6 hours)
   - Exports all tables
   - Compresses backup
   - Keeps last 28 backups (7 days)

3. **Server Monitoring** (Continuous)
   - Health checks
   - Auto-restart on failure
   - Memory monitoring

4. **Log Cleanup** (Weekly - Sunday midnight)
   - Deletes logs older than 7 days

5. **Backup Cleanup** (Monthly - 1st at 3 AM)
   - Deletes backups older than 30 days

### Manual Maintenance Scripts

```bash
# Deploy updates
./scripts/deploy.sh

# Create manual backup
./scripts/backup.sh

# Restore from backup
./scripts/restore.sh backups/dystopia_backup_20251001_040000.tar.gz

# Run daily maintenance
./scripts/daily-maintenance.sh

# Start monitoring
./scripts/monitor.sh
```

---

## 🔍 Troubleshooting

### Server Won't Start

```bash
# Check logs
pm2 logs dystopia-game-server --lines 100

# Check if port is already in use
lsof -i :3000

# Check if database is accessible
curl https://rplglfwwyavfkpvczkkj.supabase.co/rest/v1/

# Check if Redis is running
redis-cli ping
```

### High Memory Usage

```bash
# Check memory usage
pm2 monit

# Restart specific instance
pm2 restart dystopia-game-server

# Reduce number of instances
pm2 scale dystopia-game-server 2
```

### Database Connection Issues

```bash
# Test Supabase connection
cd server
tsx src/api/db/verify-tables.ts

# Check environment variables
printenv | grep SUPABASE
```

### WebSocket Connection Failures

```bash
# Check Nginx configuration
nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Check WebSocket upgrade headers
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" http://localhost:3000/socket.io/
```

### PM2 Process Crashes

```bash
# View error logs
pm2 logs dystopia-game-server --err

# Increase max restarts
pm2 restart dystopia-game-server --max-restarts 20

# Check system resources
htop
df -h
free -m
```

### Docker Container Issues

```bash
# View container logs
docker logs dystopia-game-server --tail 100 --follow

# Restart container
docker restart dystopia-game-server

# Rebuild container
docker-compose up -d --build game-server

# Check container health
docker inspect dystopia-game-server | grep -A 10 Health
```

---

## 🔐 SSL/HTTPS Setup

### Using Let's Encrypt

```bash
# Install certbot
sudo apt-get install certbot

# Generate SSL certificate
sudo certbot certonly --standalone -d dystopia-eternal.com

# Copy certificates to ssl directory
mkdir -p ssl
sudo cp /etc/letsencrypt/live/dystopia-eternal.com/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/dystopia-eternal.com/privkey.pem ssl/

# Reload Nginx
sudo systemctl reload nginx
```

### Auto-Renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Add cron job for auto-renewal
0 0 1 * * /usr/bin/certbot renew --quiet && systemctl reload nginx
```

---

## 📈 Performance Optimization

### PM2 Clustering

The ecosystem config runs 4 instances for load balancing. Adjust based on your server:

```javascript
// ecosystem.config.js
instances: 4, // Change to number of CPU cores
```

### Redis Configuration

Optimize Redis for game server:

```bash
# Edit redis.conf
maxmemory 512mb
maxmemory-policy allkeys-lru
appendonly yes
```

### Nginx Caching

Static assets are cached for 1 year. Adjust in `nginx.conf`:

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

---

## 🎯 Production Checklist

Before going live:

- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Database migrations applied
- [ ] Redis running and configured
- [ ] PM2 startup script installed
- [ ] Cron jobs configured
- [ ] Monitoring dashboard accessible
- [ ] Backup system tested
- [ ] Health checks passing
- [ ] Discord webhooks configured
- [ ] Domain DNS configured
- [ ] Firewall rules configured
- [ ] Rate limiting enabled
- [ ] Error tracking enabled

---

## 🚨 Emergency Procedures

### Complete Server Failure

```bash
# 1. Stop everything
pm2 stop all
docker-compose down

# 2. Restore from latest backup
./scripts/restore.sh backups/latest.tar.gz

# 3. Restart services
pm2 restart all
# OR
docker-compose up -d

# 4. Verify health
curl http://localhost:3000/health
```

### Database Corruption

```bash
# 1. Stop game server
pm2 stop dystopia-game-server

# 2. Restore database from backup
./scripts/restore.sh backups/dystopia_backup_YYYYMMDD_HHMMSS.tar.gz

# 3. Restart server
pm2 restart dystopia-game-server
```

### DDoS Attack

```bash
# 1. Enable rate limiting in nginx.conf (already configured)
# 2. Block suspicious IPs
sudo ufw deny from 1.2.3.4

# 3. Enable Cloudflare DDoS protection (if using)
# 4. Monitor traffic
pm2 logs | grep "429"
```

---

## 📞 Support & Monitoring

### Discord Alerts

Configure Discord webhook in `.env.production`:

```env
DISCORD_WEBHOOK=https://discord.com/api/webhooks/YOUR_WEBHOOK
```

**Alerts sent for:**
- Server crashes
- Health check failures
- Database connection lost
- Redis connection lost
- High memory usage
- Maintenance events

### Monitoring Dashboards

- **PM2 Monit**: `pm2 monit` (terminal)
- **Prometheus**: `http://localhost:9090`
- **Grafana**: `http://localhost:3030`
- **Health API**: `http://localhost:3000/health`

---

## 🔥 Final Notes

**DYSTOPIA: ETERNAL BATTLEGROUND** is now configured for:

✅ 24/7 uptime with auto-restart
✅ Load balancing across 4 instances
✅ Automatic backups every 6 hours
✅ Daily maintenance at 4 AM
✅ Real-time health monitoring
✅ Discord alerts for critical issues
✅ Horizontal scaling with Docker
✅ SSL/HTTPS support
✅ Rate limiting & DDoS protection
✅ Comprehensive logging

**The eternal war never sleeps!** ⚔️

---

## 📚 Additional Resources

- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Supabase Documentation](https://supabase.com/docs)
- [Redis Documentation](https://redis.io/docs/)

---

**Last Updated:** 2025-10-01
**Version:** 1.0.0
**Status:** Production Ready 🔥
