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

Uses [Convex Cloud](https://convex.dev) for the database (free tier available).

#### Prerequisites

1. **Create Convex project**: Run `npx convex dev` locally, then `npx convex deploy`
2. **Configure Clerk JWT**: In Clerk Dashboard → JWT Templates → Create "Convex" template
3. **AI Recipe Import** (optional): Add `OPENROUTER_API_KEY` in Convex Dashboard → Settings → Environment Variables

#### Quick Start

```bash
docker run -d \
  -p 3000:3000 \
  -e CONVEX_URL=https://your-project.convex.cloud \
  -e CLERK_PUBLISHABLE_KEY=pk_test_... \
  pantrypilot
```

#### Environment Variables

| Variable                | Required | Description                                                  |
| ----------------------- | -------- | ------------------------------------------------------------ |
| `CONVEX_URL`            | Yes      | Convex Cloud URL (e.g., `https://your-project.convex.cloud`) |
| `CLERK_PUBLISHABLE_KEY` | Yes      | Clerk publishable key                                        |

#### Unraid

Add container with:

- **Repository**: `ghcr.io/yourusername/pantrypilot:latest`
- **Port**: 3000 → your choice
- **Variables**: `CONVEX_URL`, `CLERK_PUBLISHABLE_KEY`

## Project Structure

```
├── convex/              # Convex backend (schema, queries, mutations, actions)
├── src/
│   ├── components/      # React components
│   ├── lib/             # Utilities (cooklang parser, unit conversion)
│   ├── routes/          # TanStack Router pages
│   └── styles/          # CSS styles
└── Dockerfile
```

## License

MIT
