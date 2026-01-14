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

1. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

2. **Run with Docker Compose**
   ```bash
   docker compose up -d
   ```

   Or pull from GitHub Container Registry:
   ```bash
   docker compose pull
   docker compose up -d
   ```

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
