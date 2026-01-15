# PantryPilot

A modern kitchen companion app for managing your pantry, recipes, and shopping lists. Built with React, Convex, and Clerk authentication.

## Features

### Pantry Management
- Track ingredients in your pantry with quantities and units
- Smart unit conversion between metric and imperial
- Categorized ingredient organization

### Recipe Management
- Import recipes from any URL using AI-powered extraction
- Write recipes in Cooklang format
- Scale recipes by adjusting servings
- Step-by-step cooking mode
- Automatic pantry deduction after cooking

### Shopping Lists
- Create multiple shopping lists
- Add missing recipe ingredients with one click
- Check off items as you shop

### User Accounts
- Secure authentication via Clerk (Google, email, etc.)
- Private data per user
- Account management and deletion

## Tech Stack

- **Frontend**: React 19, TanStack Router, TanStack Start (SSR)
- **Backend**: Convex (real-time database)
- **Authentication**: Clerk
- **Styling**: Tailwind CSS
- **Recipe Import**: OpenRouter AI / Cooklang

## Installation

### Prerequisites

- Node.js 22+
- Docker & Docker Compose
- A [Convex](https://convex.dev) account
- A [Clerk](https://clerk.com) account
- (Optional) [OpenRouter](https://openrouter.ai) API key for recipe import

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/pantrypilot.git
   cd pantrypilot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Convex**
   ```bash
   npx convex dev
   ```
   This will prompt you to create a new Convex project.

4. **Configure Clerk**
   - Create a new Clerk application at [clerk.com](https://clerk.com)
   - Enable Google OAuth (or other providers) in SSO Connections
   - Create a Convex JWT template (JWT Templates → Convex)
   - Copy the JWT issuer domain

5. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Fill in your `.env` file:
   ```env
   VITE_CONVEX_URL=https://your-deployment.convex.cloud
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_JWT_ISSUER_DOMAIN=https://your-app.clerk.accounts.dev
   OPENROUTER_API_KEY=sk-or-...  # Optional, for AI recipe import
   ```

6. **Run development server**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`

### Docker Deployment

The Docker image is an all-in-one container that includes:
- PantryPilot web app (port 3000)
- Self-hosted Convex backend (port 3210)
- Convex dashboard (port 6791)
- Cooklang import service (port 8080)

#### Building the Image

**Important:** `VITE_*` variables are baked into the frontend at build time. You must pass them as build arguments:

```bash
docker build \
  --build-arg VITE_CONVEX_URL=http://YOUR_SERVER_IP:3210 \
  --build-arg VITE_CLERK_PUBLISHABLE_KEY=pk_test_... \
  -t pantrypilot .
```

Replace `YOUR_SERVER_IP` with the IP address or hostname where the container will run. The browser connects directly to Convex, so this must be accessible from the client's network.

#### Running the Container

```bash
docker run -d \
  -p 3000:3000 \
  -p 3210:3210 \
  -v pantrypilot-data:/convex/data \
  -e TZ=UTC \
  -e CLERK_JWT_ISSUER_DOMAIN=https://your-app.clerk.accounts.dev \
  pantrypilot
```

#### Build Arguments (Build Time)

These are embedded into the frontend bundle during build:

| Argument | Required | Description |
|----------|----------|-------------|
| `VITE_CONVEX_URL` | Yes | Convex backend URL accessible from browser (e.g., `http://192.168.1.100:3210`) |
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key |

#### Environment Variables (Run Time)

These can be set when running the container:

| Variable | Required | Description |
|----------|----------|-------------|
| `TZ` | Yes | Must be `UTC` (Convex requirement) |
| `CLERK_JWT_ISSUER_DOMAIN` | Yes | Clerk JWT issuer domain |
| `OPENROUTER_API_KEY` | No | OpenRouter API key for AI recipe import |
| `OPENROUTER_MODEL` | No | AI model (default: `anthropic/claude-3.5-sonnet`) |

#### Ports

| Port | Service | Required |
|------|---------|----------|
| 3000 | Web UI | Yes |
| 3210 | Convex backend | Yes (browser connects directly) |
| 6791 | Convex dashboard | No |
| 8080 | Recipe import API | No |

#### Volume

Mount `/convex/data` to persist your database.

#### Unraid Deployment

1. **Build the image** on a machine with Docker:
   ```bash
   docker build \
     --build-arg VITE_CONVEX_URL=http://YOUR_UNRAID_IP:3210 \
     --build-arg VITE_CLERK_PUBLISHABLE_KEY=pk_test_... \
     -t pantrypilot .
   ```

2. **Push to a registry** (or save/load the image):
   ```bash
   docker tag pantrypilot your-registry/pantrypilot:latest
   docker push your-registry/pantrypilot:latest
   ```

3. **Add container in Unraid**:
   - **Repository**: `your-registry/pantrypilot:latest`
   - **Port Mappings**:
     - Container 3000 → Host (your choice)
     - Container 3210 → Host 3210 (must match VITE_CONVEX_URL)
   - **Volume**: `/convex/data` → `/mnt/user/appdata/pantrypilot`
   - **Variables**:
     - `TZ` = `UTC`
     - `CLERK_JWT_ISSUER_DOMAIN` = `https://your-app.clerk.accounts.dev`

## Project Structure

```
├── convex/              # Convex backend (schema, queries, mutations)
├── src/
│   ├── components/      # React components
│   ├── lib/             # Utilities (cooklang parser, unit conversion)
│   ├── routes/          # TanStack Router pages
│   └── styles/          # CSS styles
├── services/
│   └── cooklang-import/ # AI recipe import microservice
└── docker-compose.yml
```

## License

MIT
