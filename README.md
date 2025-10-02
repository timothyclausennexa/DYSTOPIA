# 🔥 DYSTOPIA: ETERNAL BATTLEGROUND

**A persistent, 24/7 multiplayer battle royale game where empires never sleep.**

[![Tests](https://img.shields.io/badge/tests-passing-brightgreen)]()
[![Build](https://img.shields.io/badge/build-passing-brightgreen)]()
[![Status](https://img.shields.io/badge/status-production%20ready-brightgreen)]()
[![License](https://img.shields.io/badge/license-GPL--3.0-blue)](LICENSE)

> **Forked from** [survev/survev](https://github.com/survev/survev)
> This project builds upon the excellent foundation of survev to create a fully persistent, faction-based warfare experience.

---

## 🎮 Game Overview

DYSTOPIA: ETERNAL BATTLEGROUND is a massive multiplayer online game featuring:

- 🏗️ **Building System** - 13 unique structures from walls to nuclear silos
- ⚔️ **Faction Warfare** - Choose between 5 warring factions (Red Empire, Blue Coalition, Green Alliance, Yellow Syndicate, Purple Order)
- 🌍 **Persistent World** - 50,000x50,000 unit world that never resets
- 👥 **Massive Multiplayer** - Support for 1000+ concurrent players
- 🎯 **Battle Royale Core** - Looting, shooting, and survival gameplay from survev
- 🔄 **24/7 Uptime** - Auto-restart, health monitoring, full persistence
- 💾 **Complete Persistence** - All buildings, territories, and progress saved forever
- 🔐 **Account System** - Create an account (no email required), track your faction allegiance

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- pnpm (package manager)
- Redis (caching)
- PostgreSQL (via Supabase)

### Installation

```bash
# Install dependencies
pnpm install

# Configure environment
cp .env.example .env.production
# Edit .env.production with your credentials

# Build project
pnpm build

# Run tests
./scripts/test.sh

# Deploy to production
./scripts/deploy.sh
```

---

## 📦 Project Structure

```
dystopia-eternal/
├── client/                 # Game client (WebGL/Canvas)
├── server/                # Game server
│   ├── src/
│   │   ├── game/systems/  # Building, territory, chat
│   │   ├── monitoring/    # Health checks
│   │   └── tests/         # Test suite
├── scripts/               # Deployment & maintenance
├── ecosystem.config.js    # PM2 configuration
├── docker-compose.yml     # Docker stack
└── nginx.conf             # Reverse proxy
```

---

## 🏗️ Building System

13 unique building types:

- Wood/Stone/Metal Walls
- Basic & Laser Turrets
- Resource Generators
- Uranium Extractors
- Storage & Crafting Stations
- Spawn Beacons
- Vehicle Factories
- Nuclear Silos
- Shield Generators

See [BUILDING_SYSTEM.md](BUILDING_SYSTEM.md) for complete documentation.

---

## 🗄️ Database

- **PostgreSQL** via Supabase (9 tables, 42 indexes)
- **Redis** for caching and job queues
- **Full ACID compliance**

See [DATABASE_SETUP.md](DATABASE_SETUP.md) for setup.

---

## 🔧 Production Deployment

```bash
# Run pre-flight check
./scripts/pre-flight-check.sh

# Deploy
./scripts/deploy.sh

# Monitor
pm2 monit
```

See [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md) for complete guide.

---

## 🧪 Testing

```bash
./scripts/test.sh
```

**10 Comprehensive Tests:**
- Database & Redis connectivity
- Player & building systems
- Load testing (100 concurrent ops)
- Memory leak detection
- Data persistence

See [TESTING.md](TESTING.md) for details.

---

## 📊 Monitoring

- **Health**: http://localhost:3000/health
- **PM2**: `pm2 monit`
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3030

---

## 🔄 Automated Maintenance

- **Daily Maintenance** - 4:00 AM
- **Database Backups** - Every 6 hours
- **Server Monitoring** - Continuous
- **Auto-restart** on crash

Setup: `./scripts/setup-cron.sh`

---

## 📚 Documentation

- [BUILDING_SYSTEM.md](BUILDING_SYSTEM.md) - Building system
- [DATABASE_SETUP.md](DATABASE_SETUP.md) - Database setup
- [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md) - Deployment
- [TESTING.md](TESTING.md) - Testing guide
- [LAUNCH.md](LAUNCH.md) - Launch checklist

---

## 🔥 Launch

```bash
# 1. Pre-flight check
./scripts/pre-flight-check.sh

# 2. Run tests
./scripts/test.sh

# 3. Deploy
./scripts/deploy.sh

# 4. Verify
./scripts/post-deploy-verify.sh
```

See [LAUNCH.md](LAUNCH.md) for complete checklist.

---

## ⚔️ THE ETERNAL BATTLEGROUND AWAITS! ⚔️

**Launch command:** `./scripts/deploy.sh`

🔥 **DYSTOPIA: ETERNAL BATTLEGROUND** 🔥

---

**Version:** 1.0.0 | **Status:** 🚀 Production Ready

---

## 📜 License

This project is licensed under the **GNU General Public License v3.0 (GPL-3.0)**.

### Attribution

DYSTOPIA: ETERNAL BATTLEGROUND is a fork of [survev/survev](https://github.com/survev/survev), which provides the core battle royale gameplay mechanics. We've extended it with:

- Persistent world systems
- Faction warfare mechanics
- Building and territory control
- Account and authentication systems
- 24/7 server infrastructure
- Enhanced UI/UX improvements

**Original Project**: [survev](https://github.com/survev/survev)
**License**: GPL-3.0
**Our Additions**: All persistent world features, faction systems, and infrastructure improvements

See [LICENSE](LICENSE) for full license text.

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/dystopia-eternal.git
cd dystopia-eternal

# Install dependencies
pnpm install

# Set up environment
cp .env.example .env.development

# Run in development
pnpm dev
```

---

## 🔗 Links

- **Live Game**: [https://dystopia.io](https://dystopia.io)
- **Discord**: [Join our community](https://discord.gg/6uRdCdkTPt)
- **Original Project**: [survev/survev](https://github.com/survev/survev)

---

## 🙏 Acknowledgments

- **survev team** for creating the excellent battle royale foundation
- **All contributors** who have helped build the persistent world features
- **Our community** for testing and feedback
