# PC Builder Frontend

React single-page application for the PC Builder platform — a database systems final project. This frontend communicates with a FastAPI backend and provides authentication, a parts catalog, PC build management, an AI chat assistant, and admin tooling.

## Tech Stack

- **React 19** with **TypeScript**
- **Vite 8** — dev server and bundler
- **React Router v7** — client-side routing
- **TanStack Query v5** — server state and caching
- **Tailwind CSS v3** — utility-first styling
- **Zod** — runtime schema validation
- **JWT** — token-based authentication

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- The [backend API](https://github.com/) running locally (default `http://localhost:8000`)

### Install

```bash
npm install
```

### Configure

Copy the example env file and adjust if needed:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|---|---|---|
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:8000` |

### Run

```bash
npm run dev
```

The app starts at [http://localhost:5173](http://localhost:5173).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run typecheck` | Run TypeScript type checking |

## Project Structure

```
src/
├── components/
│   ├── layout/        # TopNav, shell chrome
│   ├── providers/     # AuthProvider, AuthContext
│   └── ui/            # Button, Modal, TextField
├── features/
│   └── auth/          # Auth API calls and types
├── hooks/             # useAuth and other custom hooks
├── lib/
│   ├── api/           # Generic fetch client (apiRequest)
│   ├── auth/          # JWT token helpers
│   └── utils/         # cn(), safeRedirect()
├── pages/             # Route-level page components
│   └── errors/        # ErrorPage
└── router/
    ├── router.tsx     # Route definitions
    └── guards/        # RequireAuth, RequireAdmin
```

## Routes

| Path | Page | Access |
|---|---|---|
| `/` | Landing page | Public |
| `/app` | My Builds | Authenticated |
| `/app/catalog` | Parts Catalog | Authenticated |
| `/app/chat` | AI Chat | Authenticated |
| `/app/admin/users` | User Management | Admin only |