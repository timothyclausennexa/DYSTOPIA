# 🚀 DYSTOPIA UI Fixes - Deployment Guide

## ⚠️ Server Status

**Production Server:** `50.116.46.238`
**Status:** Currently unreachable (connection timeout)

The UI fixes have been successfully committed to GitHub but need to be deployed to your server.

---

## 🎯 Quick Deploy (When Server is Accessible)

### Option 1: Pull from GitHub (Recommended)

```bash
# SSH to your server
ssh root@50.116.46.238

# Navigate to app directory
cd /opt/dystopia

# Pull latest code from GitHub
git fetch origin
git pull origin master

# Install dependencies (if needed)
pnpm install

# Build client with UI fixes
cd client
pnpm build
cd ..

# Build server (if needed)
cd server
pnpm build
cd ..

# Restart all services
pm2 restart all

# Check status
pm2 status
pm2 logs --lines 50
```

### Option 2: Manual File Upload

If git pull doesn't work, upload the files manually:

```bash
# From your local machine
cd C:\Users\timot\DYSTOPIA\DYSTOPIA

# Create deployment package (UI files only)
tar -czf ui-fixes.tar.gz \
  client/css/z-index.css \
  client/css/ui-fixes.css \
  client/src/ui/appState.ts \
  client/src/ui/factionValidator.ts \
  client/src/main.ts \
  client/index.html

# Upload to server
scp ui-fixes.tar.gz root@50.116.46.238:/tmp/

# SSH to server
ssh root@50.116.46.238

# Extract files
cd /opt/dystopia
tar -xzf /tmp/ui-fixes.tar.gz

# Rebuild client
cd client
pnpm build

# Restart services
pm2 restart all
```

---

## 📋 What Was Fixed

### Files Created
- ✅ `client/css/z-index.css` - Centralized z-index scale
- ✅ `client/css/ui-fixes.css` - UI enhancements and fixes
- ✅ `client/src/ui/appState.ts` - State management system
- ✅ `client/src/ui/factionValidator.ts` - Faction validation logic

### Files Modified
- ✅ `client/index.html` - Added CSS imports, login backdrop, fixed news block
- ✅ `client/src/main.ts` - Integrated state manager and validator
- ✅ `README.md` - Added GPL-3.0 license and survev attribution
- ✅ `.gitignore` - Professional patterns

### Issues Resolved
1. **Overlapping screens** - Login, menu, faction selector now properly layered
2. **Z-index chaos** - Standardized scale from 1-10,000
3. **Deploy button** - Now enforces faction selection
4. **State management** - Clean transitions between LOGIN → MENU → GAME
5. **Visual feedback** - Shake animation for errors, hover states, focus states

---

## 🔍 Troubleshooting Server Access

### If server is unreachable:

1. **Check if server is running:**
   ```bash
   ping 50.116.46.238
   ```

2. **Verify SSH access:**
   ```bash
   ssh -v root@50.116.46.238
   ```

3. **Check firewall rules:**
   - Ensure ports 22 (SSH), 80 (HTTP), 443 (HTTPS), 3000 (API) are open

4. **Verify IP address hasn't changed:**
   - Check your hosting provider's dashboard
   - Update `upload-and-deploy.sh` if IP changed

5. **Alternative access methods:**
   - Use your hosting provider's web console
   - Access via VPN if required
   - Check if server needs to be restarted

---

## 📦 GitHub Repository

**Repository:** https://github.com/timothyclausennexa/DYSTOPIA
**Branch:** master
**Latest Commit:** e59e716b - UI/UX overhaul

All fixes are committed and pushed. Simply pull from GitHub when server is accessible.

---

## ✅ Post-Deployment Verification

After deploying, verify the fixes:

1. **Visit your game URL** (e.g., http://50.116.46.238 or your domain)

2. **Check login screen:**
   - Should appear alone with dark backdrop
   - No other UI elements visible behind it
   - Username/password inputs functional

3. **After login:**
   - Main menu appears cleanly
   - Faction selector visible and highlighted
   - Deploy button should be grayed out (disabled)

4. **Select faction:**
   - Choose any faction from dropdown
   - Deploy button turns green and active

5. **Click deploy without faction:**
   - Should show shake animation
   - Error modal appears

6. **Click deploy with faction:**
   - Smooth fade transition to game
   - No menu elements visible during gameplay

7. **Check browser console:**
   ```
   [AppState] Transitioning from login to menu
   [AppState] Transitioning from menu to game
   ```

---

## 🆘 Emergency Rollback

If something breaks after deployment:

```bash
ssh root@50.116.46.238
cd /opt/dystopia

# Rollback to previous commit
git reset --hard HEAD~1

# Rebuild
cd client && pnpm build && cd ..

# Restart
pm2 restart all
```

---

## 📞 Need Help?

**GitHub Issues:** https://github.com/timothyclausennexa/DYSTOPIA/issues
**Discord:** https://discord.gg/6uRdCdkTPt

---

**Status:** Ready to deploy when server is accessible
**Files:** All committed to GitHub at https://github.com/timothyclausennexa/DYSTOPIA
