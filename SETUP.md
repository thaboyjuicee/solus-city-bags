# Setup Guide

Step-by-step instructions for local development and production deployment.

---

## Local Development

### Prerequisites

- **Node.js ≥ 22** — [nodejs.org](https://nodejs.org)
- **PostgreSQL** — running locally (e.g. via [Postgres.app](https://postgresapp.com) on Mac, `brew install postgresql`, or Docker)
- **Git**
- A Solana wallet (Phantom or Solflare) for testing in-game flows

---

### 1. Clone the repo

```bash
git clone https://github.com/your-org/solus-city-bags.git
cd solus-city-bags
```

---

### 2. Backend setup (`solus-city-server/`)

#### Install dependencies

```bash
cd solus-city-server
npm install
```

#### Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
# PostgreSQL connection string
DATABASE_URL="postgresql://postgres:password@localhost:5432/soluscity"

# Long random string — used to sign JWTs
JWT_SECRET="replace-with-a-long-random-secret"

# Server port
PORT=3000

# Allowed CORS origin (your frontend URL)
CORS_ORIGIN="http://localhost:3001"

# Helius RPC endpoint for Solana mainnet (get a free key at helius.dev)
HELIUS_RPC_URL="https://mainnet.helius-rpc.com/?api-key=YOUR_KEY"

# Bags API key (get from bags.fm)
BAGS_API_KEY="your-bags-api-key"
```

#### Create the database

If the `soluscity` database does not exist yet:

```bash
psql -U postgres -c "CREATE DATABASE soluscity;"
```

#### Run migrations

```bash
npx prisma migrate deploy
```

#### Generate Prisma client

```bash
npx prisma generate
```

#### Seed item and crime catalog

```bash
npx prisma db seed
```

#### Start the dev server

```bash
npm run dev
```

The API is now running at **http://localhost:3000**.

---

### 3. Web client setup (`solus-city-web/`)

Open a new terminal tab.

#### Install dependencies

```bash
cd solus-city-web
npm install
```

#### Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
# Point at your local backend
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000

# Solana cluster
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta

# Helius RPC for frontend wallet interactions
NEXT_PUBLIC_HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY

# Bags API key
NEXT_PUBLIC_BAGS_API_KEY=your-bags-api-key
```

#### Start the dev server

```bash
npm run dev
```

The web client is now running at **http://localhost:3001** (Next.js picks the next available port if 3000 is taken).

---

### Available scripts

#### Backend

| Script | Description |
|---|---|
| `npm run dev` | Start with ts-node-dev (hot reload) |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm run start` | Run compiled build |
| `npx prisma migrate dev` | Create and apply a new migration |
| `npx prisma migrate deploy` | Apply existing migrations (CI / production) |
| `npx prisma db seed` | Seed items and crimes |
| `npx prisma generate` | Regenerate Prisma client after schema changes |
| `npx prisma studio` | Open Prisma Studio GUI |

#### Web client

| Script | Description |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | Run ESLint |

---

## Production Deployment

### Backend — Railway

1. **Create a Railway project** at [railway.app](https://railway.app).

2. **Add a PostgreSQL plugin** — Railway provisions the database and automatically injects `DATABASE_URL` and `DATABASE_PUBLIC_URL`.

3. **Add a new service** from the GitHub repo. Set the **Root Directory** to `solus-city-server`.

4. Railway will detect the `build` and `start` scripts from `package.json` automatically:
   - Build: `npm run build`
   - Start: `npm run start`

5. **Set environment variables** in Railway → Service → Variables:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | Auto-set by Railway PostgreSQL plugin |
   | `JWT_SECRET` | Long random secret (≥ 32 chars) |
   | `NODE_ENV` | `production` |
   | `PORT` | `3000` (Railway injects `PORT` automatically, but set it explicitly) |
   | `CORS_ORIGIN` | Your Vercel frontend URL, e.g. `https://soluscity.xyz` |
   | `HELIUS_RPC_URL` | Your Helius mainnet RPC endpoint |
   | `BAGS_API_KEY` | Your Bags API key |

6. **Run migrations on deploy** — add a deploy command or run once via Railway's shell:
   ```bash
   npx prisma migrate deploy && npx prisma db seed
   ```

7. **Custom domain** — in Railway → Service → Settings → Domains, add your domain and update DNS as instructed.

---

### Web Client — Vercel

1. **Import the repo** at [vercel.com/new](https://vercel.com/new).

2. Set the **Root Directory** to `solus-city-web`.

3. Vercel detects Next.js automatically — no build command changes needed.

4. **Set environment variables** in Vercel → Project → Settings → Environment Variables:

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_API_BASE_URL` | Your Railway backend URL, e.g. `https://solus-city-app-production.up.railway.app` |
   | `NEXT_PUBLIC_SOLANA_NETWORK` | `mainnet-beta` |
   | `NEXT_PUBLIC_HELIUS_RPC_URL` | Your Helius mainnet RPC endpoint |
   | `NEXT_PUBLIC_BAGS_API_KEY` | Your Bags API key |

5. **Deploy** — push to `master` (or your production branch) to trigger a deploy.

6. **Custom domain** — in Vercel → Project → Domains, add `soluscity.xyz` (or your domain) and update your DNS records:
   - Add a `CNAME` record pointing to `cname.vercel-dns.com` (for subdomains)
   - Or an `A` record pointing to Vercel's IP (for apex domains — Vercel provides the IP in the dashboard)

---

### Production checklist

- [ ] `DATABASE_URL` points to Railway's production PostgreSQL instance
- [ ] `JWT_SECRET` is a strong, unique secret (not the same as any dev value)
- [ ] `CORS_ORIGIN` matches the exact origin of the frontend (no trailing slash)
- [ ] Migrations applied: `npx prisma migrate deploy`
- [ ] Seed data applied: `npx prisma db seed`
- [ ] `NEXT_PUBLIC_API_BASE_URL` is the Railway backend URL (no trailing slash)
- [ ] Both `HELIUS_RPC_URL` and `NEXT_PUBLIC_HELIUS_RPC_URL` use a production-tier Helius key
- [ ] Custom domain DNS propagated and SSL certificates issued (automatic on both Railway and Vercel)
