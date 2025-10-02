# 🔥 DYSTOPIA: ETERNAL BATTLEGROUND - Local Development

## Quick Start (Development Mode)

Since you're on Windows and don't have Redis/full production setup, let's run in development mode:

### Option 1: Start Development Servers (Recommended for Local)

```bash
# Terminal 1: Start game server
cd server
pnpm dev:game

# Terminal 2: Start API server
cd server
pnpm dev:api

# Terminal 3: Start client
cd client
pnpm dev
```

This will run the game in development mode without needing:
- Redis (optional for dev)
- PM2
- Production builds
- SSL certificates

### Option 2: Start All at Once

```bash
# From root directory
pnpm dev
```

This uses `concurrently` to run all servers together.

### Access the Game

Once running:
- **Game Client**: http://localhost:3000 (or the port Vite shows)
- **API Server**: http://localhost:8000
- **Game Server**: http://localhost:8001

---

## 🔧 Configuration for Local Development

The game will work without Redis in development mode. The building system and other features using Supabase will still work.

### Environment Variables

Make sure you have `.env.development` with your Supabase credentials:

```env
SUPABASE_URL=https://rplglfwwyavfkpvczkkj.supabase.co
SUPABASE_SERVICE_KEY=your_service_key_here
SUPABASE_ANON_KEY=your_anon_key_here
```

---

## 🚀 When You're Ready for Production

For full production deployment with PM2, Redis, monitoring, etc., you'll need:

1. Install Redis: https://redis.io/docs/install/install-redis/
2. Install PM2: `npm install -g pm2`
3. Run: `./scripts/deploy.sh`

But for local development and testing, the dev servers work great!

---

## 🎮 Current Status

✅ **Server build complete** - `server/dist/` ready
✅ **Supabase connected** - Database ready
✅ **Building system** - Ready to use
✅ **Health monitoring** - Available
✅ **Test suite** - Can run `pnpm test`

⏳ **Client build** - Not needed for dev mode (Vite serves it live)
⏳ **Redis** - Optional for development
⏳ **PM2** - Only needed for production

---

## ⚔️ START PLAYING NOW!

```bash
cd server
pnpm dev:game
```

Then in another terminal:

```bash
cd client
pnpm dev
```

**THE ETERNAL BATTLEGROUND AWAITS!** 🔥
