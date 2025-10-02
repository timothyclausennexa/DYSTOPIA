# 🚀 Deploy DYSTOPIA UI Fixes to Linode

## 📍 Server Information

- **Hosting Provider:** Linode
- **Server IP:** 50.116.46.238
- **Reverse DNS:** 50-116-46-238.ip.linodeusercontent.com
- **Location:** Linode datacenter
- **Status:** Currently unreachable via SSH (may be firewall or down)

---

## 🔑 Method 1: Deploy via Linode Web Console (Recommended)

### Step 1: Access Linode Dashboard

1. Go to https://cloud.linode.com/
2. Log in with your Linode credentials
3. Find your server (50.116.46.238) in the dashboard

### Step 2: Launch LISH Console

1. Click on your Linode instance
2. Click on **"Launch LISH Console"** (top right)
3. This opens a web-based terminal directly to your server
4. Log in as root when prompted

### Step 3: Deploy the UI Fixes

Once in the LISH console, run:

```bash
# Navigate to app directory
cd /opt/dystopia

# Pull latest changes from GitHub
git pull origin master

# Install dependencies
pnpm install

# Build client with UI fixes
cd client
pnpm build
cd ..

# Build server
cd server
pnpm build
cd ..

# Restart services
pm2 restart all

# Check status
pm2 status
pm2 logs --lines 50
```

### Step 4: Verify Deployment

Visit your game at the server IP or domain to verify the UI fixes are live.

---

## 🔑 Method 2: Fix SSH Access First

If LISH console doesn't work, check SSH access:

### In Linode Dashboard:

1. **Check if server is running:**
   - Go to your Linode dashboard
   - Ensure the server shows "Running" status
   - If not, click "Power On"

2. **Check firewall rules:**
   - Go to "Firewalls" tab
   - Ensure ports are open:
     - Port 22 (SSH)
     - Port 80 (HTTP)
     - Port 443 (HTTPS)
     - Port 3000 (Game API)

3. **Add your IP to firewall:**
   - Click "Edit Rules"
   - Add your current IP address to SSH allowed list
   - Save changes

4. **Try SSH again:**
   ```bash
   ssh root@50.116.46.238
   ```

---

## 🔑 Method 3: Use Linode API/CLI

If you have Linode CLI installed:

```bash
# Install Linode CLI (if not installed)
pip3 install linode-cli

# Configure CLI
linode-cli configure

# List your Linodes
linode-cli linodes list

# SSH using Linode CLI
linode-cli linodes ssh <linode-id>
```

---

## 📋 What Gets Deployed

### New Files:
- ✅ `client/css/z-index.css` - Z-index scale
- ✅ `client/css/ui-fixes.css` - UI enhancements
- ✅ `client/src/ui/appState.ts` - State manager
- ✅ `client/src/ui/factionValidator.ts` - Validation

### Modified Files:
- ✅ `client/index.html` - Backdrop & CSS imports
- ✅ `client/src/main.ts` - State integration
- ✅ `README.md` - GPL-3.0 license
- ✅ `.gitignore` - Professional patterns

---

## ✅ Post-Deployment Checklist

After deploying, verify:

1. **Server is running:**
   ```bash
   pm2 status
   # Should show all processes running
   ```

2. **Build completed:**
   ```bash
   ls -la client/dist/
   # Should see index.html and assets
   ```

3. **No errors in logs:**
   ```bash
   pm2 logs --lines 100
   # Check for any error messages
   ```

4. **Game is accessible:**
   - Visit: http://50.116.46.238
   - Should see clean login screen
   - No overlapping UI elements

---

## 🆘 Troubleshooting

### Server Won't Start

```bash
# Check if ports are in use
netstat -tlnp | grep 3000

# Kill conflicting processes
pm2 delete all
pm2 start ecosystem.config.js

# Check system resources
free -h
df -h
```

### Build Fails

```bash
# Clear cache and rebuild
cd /opt/dystopia/client
rm -rf node_modules dist .vite
pnpm install
pnpm build
```

### PM2 Issues

```bash
# Reset PM2
pm2 kill
pm2 resurrect

# Or restart from scratch
pm2 delete all
pm2 start server/dist/gameServer.js --name dystopia-game
pm2 start server/dist/api/apiServer.js --name dystopia-api
pm2 save
```

---

## 🔍 Check Linode Server Status

### Via Dashboard:
1. Login to https://cloud.linode.com/
2. Check "Linodes" section
3. Look for your server (50.116.46.238)
4. Status should show "Running"

### If Server is Down:
1. Click on the server
2. Click "Power On"
3. Wait 1-2 minutes for boot
4. Try SSH or LISH console again

---

## 📞 Linode Support

If you can't access the server:

1. **Open Support Ticket:**
   - Go to https://cloud.linode.com/support/tickets
   - Click "Open New Ticket"
   - Explain you can't SSH to 50.116.46.238

2. **Check Account Status:**
   - Ensure billing is current
   - Check for any account notifications

3. **Network Status:**
   - Visit https://status.linode.com/
   - Check if there are any outages

---

## 🎯 Quick Deploy Command

Once you have access via LISH console:

```bash
cd /opt/dystopia && \
git pull origin master && \
pnpm install && \
cd client && pnpm build && cd .. && \
cd server && pnpm build && cd .. && \
pm2 restart all && \
pm2 status
```

Copy and paste this single command to deploy everything at once.

---

## 📦 Alternative: Manual Upload

If git pull fails, manually upload files:

```bash
# From your local machine
cd C:\Users\timot\DYSTOPIA\DYSTOPIA

# Create archive
tar -czf ui-fixes.tar.gz client/css client/src/ui client/index.html

# Upload via Linode file manager or use SFTP
# Then extract on server:
cd /opt/dystopia
tar -xzf ui-fixes.tar.gz
cd client && pnpm build && cd ..
pm2 restart all
```

---

## ✨ Success Indicators

After deployment, you should see:

1. **PM2 Status:**
   ```
   ┌────────────────┬──────┬─────────┬─────────┐
   │ Name           │ mode │ status  │ restart │
   ├────────────────┼──────┼─────────┼─────────┤
   │ dystopia-game  │ fork │ online  │ 0       │
   │ dystopia-api   │ fork │ online  │ 0       │
   └────────────────┴──────┴─────────┴─────────┘
   ```

2. **Game URL works:**
   - http://50.116.46.238 → Clean login screen
   - No overlapping elements
   - Deploy button functional

3. **Browser Console:**
   ```
   [AppState] Transitioning from login to menu
   Faction validation active
   ```

---

**Files ready on GitHub:** https://github.com/timothyclausennexa/DYSTOPIA
**Just need Linode access to deploy!**
