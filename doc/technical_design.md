# PC Build Assistant — Frontend Technical Design

This document is the engineering reference for the frontend. It describes every major component of the SPA, how they fit together, and the design decisions behind them. The user-facing quick-start lives in the repo `README.md`; everything technical lives here.

---

## 1. System Overview

The frontend is a Vite + React 19 single-page application (SPA) written in TypeScript. It is the sole UI for the PC Build Assistant platform and talks to the FastAPI backend over HTTPS/JSON. Responsibilities:

- Authenticate users via the backend's JWT endpoints and persist the session in `localStorage`.
- Let users browse a read-only hardware parts **catalog** with search, filter, sort, and pagination.
- Let users create, rename, clone, delete, and edit **builds**, including adding/removing/swapping components in each slot.
- Let users chat with the AI assistant — threads, messages, and per-message build attachment — and render the Markdown reply.
- Provide admin-only views for user management (list users, create users, toggle roles).

### Runtime topology

```
┌──────────────────────────┐         HTTPS / REST (JSON)        ┌─────────────────────────┐
│   Browser (this repo)    │ ─────────────────────────────────▶ │   FastAPI backend       │
│                          │                                     │   (separate repo)       │
│  React 19 + Vite SPA     │                                     │                         │
│  ├── React Router v7     │                                     │   /api/v1/auth/*        │
│  ├── TanStack Query v5   │                                     │   /api/v1/users/*       │
│  ├── Zod (runtime types) │                                     │   /api/v1/builds/*      │
│  ├── Tailwind CSS        │                                     │   /api/v1/catalog/*     │
│  └── framer-motion       │                                     │   /api/v1/threads/*     │
└──────────┬───────────────┘                                     └────────────┬────────────┘
           │                                                                  │
           │ localStorage: `pcbuild_access_token`                             │
           ▼                                                                  ▼
      Browser storage                                                  PostgreSQL + AI stack
```

- **The backend is the only runtime dependency.** There are no edge functions, no BFF layer, no direct DB access from the browser — every data read/write goes through `/api/v1/*`.
- **Auth is JWT bearer tokens.** The token is acquired from `POST /api/v1/auth/login`, stored in `localStorage`, and attached as `Authorization: Bearer ...` on every authenticated call.
- **Server state is owned by TanStack Query**, not by component state or Redux-style stores. React state is used only for UI affordances (modals, drafts, pagination cursors).

### Repository layout

```
src/
├── main.tsx                       # React root; mounts <App/>
├── App.tsx                        # QueryClientProvider → AuthProvider → RouterProvider
├── index.css / App.css            # Tailwind base + global CSS
│
├── components/
│   ├── chat/
│   │   └── AiMarkdown.tsx         # ReactMarkdown renderer tuned for the AI reply bubble
│   ├── icons/                     # (reserved) additional icon assets
│   ├── layout/
│   │   └── TopNav.tsx             # Header with brand mark, links, login/logout
│   ├── providers/
│   │   ├── AuthContext.ts         # AuthState union + context value
│   │   └── AuthProvider.tsx       # Token state, me-query, login/logout
│   └── ui/
│       ├── Button.tsx             # Variant + loading-aware button
│       ├── Modal.tsx              # framer-motion dialog + esc-to-close
│       ├── ConfirmDialog.tsx      # Destructive/default confirmation wrapper
│       └── TextField.tsx          # Labeled input with optional error text
│
├── features/                      # One folder per domain; co-located types + API calls
│   ├── auth/
│   │   ├── auth.api.ts            # register / login / me
│   │   └── auth.types.ts          # Zod schemas for User, UserOut, LoginResponse
│   ├── builds/
│   │   ├── builds.api.ts          # build + build-parts CRUD, clone, part-types
│   │   └── builds.types.ts        # Zod schemas for builds and parts
│   ├── catalog/
│   │   ├── catalog.api.ts         # list + detail for all nine categories
│   │   └── catalog.types.ts       # Category union + per-category column defs
│   ├── chat/
│   │   ├── chat.api.ts            # thread + message CRUD; listAllMessages helper
│   │   ├── chat.types.ts          # Zod schemas for threads, messages, pagination
│   │   └── threadTitle.ts         # Derive a human title from the first message
│   └── users/
│       ├── users.api.ts           # admin user management + self profile
│       └── users.types.ts         # PaginatedUsers + payload types
│
├── hooks/
│   └── useAuth.ts                 # Safe consumer for AuthContext
│
├── lib/
│   ├── api/
│   │   └── client.ts              # `apiRequest` + ApiError + FastAPI detail normalizer
│   ├── auth/
│   │   └── token.ts               # localStorage accessors + JWT decode/expiry
│   └── utils/
│       ├── cn.ts                  # tailwind-merge + clsx helper
│       └── safeRedirect.ts        # open-redirect guard for post-login paths
│
├── pages/                         # Route-level components (one per screen)
│   ├── LandingPage.tsx            # Public marketing + auth modal
│   ├── AppShell.tsx               # Authenticated layout (top nav + sidebar + outlet)
│   ├── BuildsPage.tsx             # “My Builds” grid, create/edit/delete/clone
│   ├── BuilderPage.tsx            # Single build editor with part slots + picker modal
│   ├── CatalogPage.tsx            # Browse all nine component categories
│   ├── ChatPage.tsx               # Threads sidebar + conversation + composer
│   ├── AdminUsersPage.tsx         # Admin-only user list + role toggle + create modal
│   └── errors/
│       └── ErrorPage.tsx          # Router-level errorElement
│
└── router/
    ├── router.tsx                 # Route tree (createBrowserRouter)
    ├── guards/
    │   ├── RequireAuth.tsx        # Redirects anonymous users to /
    │   └── RequireAdmin.tsx       # Additional role gate
    └── layouts/                   # (reserved) nested layouts

public/                            # Static assets served as-is by Vite
index.html                         # Vite entry template
vite.config.ts                     # Vite config (React plugin, `@` alias, port 5173)
tailwind.config.js                 # Tailwind theme (ink/mist/brand palette, shadows)
tsconfig.app.json                  # Strict TS + bundler resolution + @/* path alias
eslint.config.js                   # ESLint flat config + Prettier compat
```

Empty folders like `src/components/icons`, `src/features/auth/{components,hooks,pages}`, and `src/lib/{errors,guardrails,storage}` exist as scaffolding for future work; they are intentionally left in the tree so new code has an obvious home.

---

## 2. Build & Tooling

### 2.1 Runtime and bundler

- **React 19** (`react`, `react-dom`) — the app uses the modern `createRoot` API and React Strict Mode in dev.
- **Vite 8** (`vite`, `@vitejs/plugin-react`) — dev server, HMR, and production bundler.
  - `vite.config.ts` aliases `@` to `src/` so every import reads as `@/features/...` rather than relative paths.
  - Dev server pinned to port **5173**.

### 2.2 TypeScript

- `tsconfig.app.json` compiles in strict mode with `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports`, and `erasableSyntaxOnly`.
- `verbatimModuleSyntax` is enabled — runtime-only imports must be kept distinct from `import type`. All feature files follow this (e.g. `import type { BuildDetail } from './builds.types'`).
- Path alias `@/*` → `src/*` mirrors the Vite config so the IDE and bundler agree.

### 2.3 Lint & format

- ESLint flat config combines `@eslint/js` recommended, `typescript-eslint` recommended, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh` (Vite fast-refresh boundary rule), and `eslint-config-prettier` to defer style conflicts to Prettier.
- Prettier config is minimal (`.prettierrc.json`). Run `npm run format` for a full tree rewrite.

### 2.4 Styling

- **Tailwind v3** with a small, intentional palette defined in `tailwind.config.js`:
  - `ink.*` — near-black text and buttons (`950`, `900`, `800`).
  - `mist.*` — off-white surfaces and hairlines (`50`, `100`, `200`, `300`).
  - `brand.*` — the accent blue used for primary actions (`600`, `500`, `400`).
  - Custom shadows `shadow-soft` and `shadow-card`, and a named radius `rounded-xl2` (`1.25rem`) used across cards and modals.
- `src/lib/utils/cn.ts` merges class lists via `clsx + tailwind-merge`. This is the single place class strings get composed — every `className={cn(...)}` call goes through it so conflicting utilities (`px-3` vs `px-4`) resolve last-wins instead of duplicating on the element.
- Global styles are minimal (`index.css` imports Tailwind base; `App.css` is effectively empty).

### 2.5 NPM scripts

| Script | What it runs |
| --- | --- |
| `dev` | `vite` dev server with HMR |
| `build` | `tsc -b && vite build` — typecheck then bundle |
| `preview` | Preview the built bundle locally |
| `lint` | `eslint .` |
| `format` | Prettier rewrite of the whole tree |
| `typecheck` | `tsc -b --pretty false` (CI-friendly) |

---

## 3. Application Bootstrap

### 3.1 Entry point (`src/main.tsx`)

`createRoot(...).render(<StrictMode><App /></StrictMode>)`. Strict Mode is always on in dev, so any side-effect that isn't idempotent (fetch, subscription, query) must account for a double mount — see §4.2.

### 3.2 Provider stack (`src/App.tsx`)

```
<QueryClientProvider>    # TanStack Query cache
  <AuthProvider>         # Token state + user profile
    <RouterProvider />   # All routes
  </AuthProvider>
</QueryClientProvider>
```

The `QueryClient` is configured with defaults that matter for this app:

- `staleTime: 30s` — in React Strict Mode, components mount twice; a non-zero `staleTime` keeps the first successful fetch “fresh” so the second mount reuses the cache instead of re-firing the query. Without this, every screen would run every query twice in dev.
- `gcTime: 5m` — cached but unused entries linger long enough to feel instant when users switch tabs.
- `retry: 1` for queries, `retry: 0` for mutations — UX-friendly network flakiness handling, but never replay a POST/PATCH/DELETE silently.
- `refetchOnWindowFocus: false` — the app is not real-time; window focus refetches would cause surprising re-renders while typing in a chat composer.

---

## 4. Routing

### 4.1 Route tree (`src/router/router.tsx`)

The router is a single `createBrowserRouter` call. Shape:

```
/                               LandingPage                             public
/app                            RequireAuth (guard layout)              authenticated
  ↳                             AppShell (nav + outlet)
      index → BuildsPage        /app                                   My Builds
      builds/:id → BuilderPage  /app/builds/:id                        Single build editor
      catalog → CatalogPage     /app/catalog                           Parts catalog
      chat → ChatPage           /app/chat                              AI chat
      admin → RequireAdmin      /app/admin                             (no UI, just gate)
        users → AdminUsersPage  /app/admin/users                       Admin user mgmt
```

`errorElement: <ErrorPage />` is attached at both the root and `/app` level so both public and app errors fall back to the same styled error page.

### 4.2 Guards

**`RequireAuth`** (`src/router/guards/RequireAuth.tsx`) inspects the `AuthState` union:

| State | Render |
| --- | --- |
| `loading` | Skeleton panel (no flicker while the me-query is in flight) |
| `profile_error` | Inline card with **Retry** and **Sign out** actions — network-flake recovery without losing the token unless the user chooses |
| `anonymous` | `<Navigate to="/" replace state={{ from, openAuth: true }} />` — preserves the destination URL and flags the landing page to open the auth modal |
| `authenticated` | `<Outlet />` |

Carrying `from` on the redirect state enables a post-login bounce back to the original URL (`/app/chat?thread=42` for example) after successful login. The landing page runs it through `safePostLoginPath` (§7.3) to block open redirects.

**`RequireAdmin`** (`src/router/guards/RequireAdmin.tsx`) renders the same skeleton while loading, redirects to `/` if unauthenticated, and to `/app` if authenticated but not admin. It does **not** show a “forbidden” page — a non-admin navigating `/app/admin/users` just silently lands on their Builds page.

### 4.3 Page transitions

`AppShell.tsx` wraps the route `Outlet` in `<AnimatePresence mode="wait">` with a simple fade/slide variant keyed on `location.pathname`. The transition uses a custom cubic-bezier (`[0.22, 1, 0.36, 1]`) and a 250ms duration — long enough to register as an intentional transition, short enough to never block interaction.

---

## 5. Authentication & Session

Auth in this frontend has three layers: token storage, live session state (AuthProvider), and route guards.

### 5.1 Token storage (`src/lib/auth/token.ts`)

- Storage key: `pcbuild_access_token` (local constant `AUTH_TOKEN_STORAGE_KEY`).
- `getToken() / setToken(t) / clearToken()` wrap `localStorage`.
- `decodeToken(token)` uses `jwt-decode` to pull the claims, then validates them with a small Zod schema (`sub`, `role`, `exp`). Any malformed JWT returns `null` rather than throwing — callers only need to check for `null`.
- `isTokenExpired(token)` compares `payload.exp` against `Math.floor(Date.now()/1000)`. **All expiry checks are done client-side** to decide whether to even attempt a `/me` call; the server is still the source of truth, but this avoids a spurious 401 round-trip on page load with a stale token.

`localStorage` is a deliberate trade-off:

- Pros — survives reloads and multiple tabs; simple; no cookie domain configuration.
- Cons — not XSS-proof. The app mitigates XSS by rendering all untrusted text via React (auto-escaped) and by only using Markdown rendering with `react-markdown` (no `dangerouslySetInnerHTML`). There is **no** CSRF concern because the app never sends cookies.

### 5.2 AuthProvider (`src/components/providers/AuthProvider.tsx`)

The provider owns the `token` React state and exposes four things through `AuthContext`: `state`, `login`, `logout`, `refetchSession`.

`AuthState` (in `AuthContext.ts`) is a discriminated union, not a bag of booleans:

```
| { status: 'anonymous';      token: null;   user: null }
| { status: 'authenticated';  token: string; user: User }
| { status: 'loading';        token: string; user: null }
| { status: 'profile_error';  token: string; user: null }
```

This union is the most important type in the app — every screen that needs auth narrows on it and pulls `token` off the authenticated variant instead of threading a nullable token around.

Key behaviors:

- **Initial token hydration** is done synchronously in the `useState` initializer so the first render already reflects what's in `localStorage`. Expired tokens are cleared immediately (no `useEffect` round-trip).
- **`/auth/me` is the source of truth for the `user` object.** A `useQuery` keyed on `['auth', 'me', token]` loads the profile whenever the token changes. Key is token-scoped so switching accounts naturally invalidates the cache.
- **401 / 403 are terminal.** The query retry predicate refuses to retry those statuses, and a separate effect queues a `logout()` via `queueMicrotask` so the state transition doesn't fight the render that's in flight.
- **Cross-tab sync.** A `storage` event listener watches for changes to `AUTH_TOKEN_STORAGE_KEY`: if another tab logs out, this tab clears its state; if another tab logs in with a valid non-expired token, this tab adopts the token and invalidates its me-query.
- **Optimistic cache seeding.** After `login`, the provider pre-populates the me-query cache via `qc.setQueryData(['auth', 'me', token], res.user)` using the `user` payload from the login response, avoiding a second GET before the shell renders.

### 5.3 `useAuth` hook (`src/hooks/useAuth.ts`)

Thin wrapper over `useContext(AuthContext)` that throws if used outside `AuthProvider`. This is the one hook every page uses:

```tsx
const { state } = useAuth()
const token = state.status === 'authenticated' ? state.token : ''
```

The empty-string fallback plays well with TanStack Query's `enabled: !!token` gate — queries simply don't fire for anonymous users, and TypeScript doesn't need to narrow the token to non-null in the `queryFn`.

### 5.4 Login and logout

- `login(email, password)` calls `POST /auth/login` via `auth.api.ts`, stores the token, pre-seeds the me-query cache, and returns. Errors (wrong password, 401) propagate as `ApiError` so the caller — the landing page auth modal — can render the message.
- `logout()` clears both the token and the me-query from the cache (via `qc.removeQueries`). It does **not** invalidate other caches — those get released naturally as guards redirect and unmount the screens that own them.
- The landing page's post-login flow uses `safePostLoginPath` to sanitize the `from` path the guard attached, then calls `navigate(next, { replace: true })`.

---

## 6. HTTP Layer

### 6.1 `apiRequest` (`src/lib/api/client.ts`)

Every network call goes through a single generic `apiRequest<T>(path, opts)` function. It is intentionally small but does four things every caller would otherwise duplicate:

1. **Resolves the base URL** from `import.meta.env.VITE_API_BASE_URL`. If that env var isn't set, it logs a `console.warn` once at module load so local dev misconfigurations are loud instead of silent.
2. **Attaches the Authorization header** if `opts.token` is provided.
3. **Serializes `opts.body` as JSON** (and sets `Content-Type` accordingly) only when the caller explicitly provides a body.
4. **Normalizes error responses into `ApiError`**:
   - Reads the response as JSON if `content-type: application/json`, else text.
   - If the status is not OK, `formatApiErrorDetail(parsed.detail)` coerces FastAPI's three response shapes — string `detail`, object `{detail: {...}}`, or Pydantic validation list `[{msg, loc, ...}]` — into a single display string.
   - Throws `ApiError(message, status, body)`. The `status` field is the key — UI code checks `err.status === 401 || err.status === 403` without parsing strings.

### 6.2 Optional Zod validation

`apiRequest` accepts an optional `schema: z.ZodType<T>`. When provided, the parsed JSON is run through the schema before being returned:

```ts
return apiRequest('/api/v1/auth/me', { method: 'GET', token, schema: userOutSchema })
```

This gives us **runtime type checking on responses** in critical paths (auth, builds, threads, messages, users). A schema mismatch throws a `ZodError` at the fetch call site, which TanStack Query catches and surfaces as a query error. Catalog responses are intentionally left unparsed because they're polymorphic (nine categories with different shapes) — the `CatalogItem` type uses an index signature instead.

### 6.3 Abort & cancellation

`opts.signal` is forwarded to `fetch`, so any caller can bind an `AbortController` to a request. In practice the app relies on TanStack Query's built-in cancellation; no handcrafted `AbortController` is needed at call sites.

### 6.4 HTTP method coverage

The `HttpMethod` type is restricted to `GET | POST | PATCH | DELETE`. The backend exposes no `PUT` endpoints, so `PUT` is deliberately absent from the union — any attempt to use it fails at compile time.

---

## 7. Feature API Modules

Each feature folder in `src/features/` contains two files: a `*.types.ts` with Zod schemas and derived TypeScript types, and a `*.api.ts` with the functions that call `apiRequest`. Components never call `apiRequest` directly — they always go through the feature module, which keeps URL paths, schemas, and payload shapes in one place per domain.

### 7.1 `features/auth`

`auth.types.ts` defines:

- `roleSchema` — `z.enum(['user','admin'])`, exported as the `Role` type.
- `userSchema` / `User` — id, email, first/last name, role. No timestamps (that's the minimal shape the UI needs).
- `userOutSchema` / `UserOut` — `userSchema` plus `created_at`. Used anywhere we display the user's join date (admin user list).
- `loginResponseSchema` / `LoginResponse` — `{ access_token, token_type, user }`. The provider uses the embedded `user` to pre-seed the me-query cache.

`auth.api.ts` exposes three functions: `register`, `login`, `me`. All are thin wrappers over `apiRequest` with the right schema attached.

### 7.2 `features/builds`

`builds.types.ts` models the polymorphic build structure returned by the backend:

- `partTypeSchema` — the backend's part-type catalog entry. `allow_multiple` drives whether a slot can hold multiple rows (RAM, storage, fans) or exactly one (CPU, GPU, mobo, PSU, case, cooler). The Builder page uses this to decide whether to show Add/Swap/Quantity controls.
- `componentSchema` — the enriched `{ id, name, price }` payload the backend joins into each build part so the UI doesn't have to.
- `buildPartDetailSchema` — a single row: `part_type`, `part_id`, `quantity`, enriched `component`, and a `line_total` that the backend pre-computes as `quantity * component.price`.
- `buildSummarySchema` / `BuildSummary` — the list view's shape (`parts_count`, `total_price`, timestamps — no parts).
- `buildDetailSchema` / `BuildDetail` — the detail view's shape, with an embedded `parts: BuildPartDetail[]`.

All prices are strings (backend's `Decimal` serialization), so every call site coerces via `Number(...)` at display time.

`builds.api.ts` covers:

- `getPartTypes` — cached forever with TanStack Query's `staleTime: Infinity`; part-type metadata doesn't change during a session.
- `listBuilds`, `getBuild`, `createBuild`, `updateBuild`, `deleteBuild`, `cloneBuild`.
- `listBuildParts`, `addBuildPart`, `updateBuildPart`, `removeBuildPart`.

### 7.3 `features/catalog`

`catalog.types.ts` encodes **what the UI knows about each category's schema** without trying to model every column at runtime:

- `CATEGORIES` — `readonly` tuple of the nine backend category keys.
- `Category` — the literal union derived from the tuple.
- `CATEGORY_LABELS` — display labels (e.g. `cpu → 'CPUs'`, `mobo → 'Motherboards'`).
- `ColumnDef` — `{ key, label, sortable?, format? }`. The optional `format` takes the raw value and returns a display string (currency for prices, yes/no for PWM flags, string coercion for nullable columns).
- `CATEGORY_COLUMNS` — a `Record<Category, ColumnDef[]>` that encodes the exact columns shown in tables for each category. Changing a column label or adding a new one is a one-line edit here; the catalog page and the build picker pick it up automatically.

`CatalogItem` uses `[key: string]: unknown` because each category returns a different shape. The `CATEGORY_COLUMNS` entries are the typed contract; anything outside them is rendered through `String(item[key])` with `—` fallback.

`catalog.api.ts` has two functions — `listCatalog(category, query)` and `getCatalogItem(category, id)` — both of which build a query string from the optional `CatalogQuery` fields (`page`, `size`, `min_price`, `max_price`, `search`, `sort_by`, `order`).

### 7.4 `features/chat`

`chat.types.ts` uses `z.*.passthrough()` on the thread/message schemas. This is deliberate: the backend may evolve (new audit fields, new computed columns on the list view) and the frontend must not explode when it encounters unknown keys. The fields the UI actually reads are typed; everything else is preserved but ignored.

- `threadOutSchema` — full thread payload (id, `thread_name`, timestamps).
- `threadListItemSchema` — the list-view shape with `message_count` and `updated_at` used for the sidebar's sort and secondary label.
- `messageOutSchema` — a single turn: `user_request`, `ai_response`, optional `build_id`, `created_at`. Both request and response are stored on the same row, matching the backend's schema.
- `paginatedThreadsSchema` / `paginatedMessagesSchema` — generic `{ items, total, page, size, pages }` envelopes.

`chat.api.ts` functions:

- `createThread`, `listThreads`, `getThread`, `patchThread`, `deleteThread`.
- `postMessage`, `listMessages`, `getMessage`.
- `listAllMessages(token, threadId)` — **the only paginator that auto-unfolds**. It fetches page 1 (`size=200`) then loops through any remaining pages and concatenates. The chat page never needs to deal with message pagination — it renders the whole thread. For threads with ≤200 turns (virtually all of them) this is a single request.

`threadTitle.ts` exports `deriveThreadTitle(raw, max=72)` — takes the first line of the user's first message, collapses whitespace, and truncates with an ellipsis. Used immediately after creating a new thread to PATCH a title so the sidebar has something other than `Chat N`.

### 7.5 `features/users`

`users.types.ts`:

- `paginatedUsersSchema` — `{ items: UserOut[], total, page, size, pages }`.
- `CreateUserPayload`, `UpdateProfilePayload` — POST/PATCH bodies.

`users.api.ts` functions:

- `updateProfile(token, payload)` — self-edit via `PATCH /api/v1/users/me`.
- `listUsers(token, { page, size })` — admin-only.
- `createUser(token, payload)` — admin-only.
- `changeUserRole(token, userId, role)` — admin-only; the role is passed as a **query-string parameter**, matching the backend's endpoint contract (`/api/v1/users/{id}/role?role=admin`).

---

## 8. Pages

Every page is a default export-free component under `src/pages/`. They share a few patterns:

- Grab `state` from `useAuth()` and derive `token = state.status === 'authenticated' ? state.token : ''`.
- Use TanStack Query `useQuery` for reads (keyed by URL params or pagination cursors) and `useMutation` for writes. `onSuccess` handlers call `qc.invalidateQueries({ queryKey: [...] })` to keep list views consistent with detail views.
- Render three states per data view: `isPending` → skeleton, `isError` → inline red alert with `ApiError.message` when available, success → content.
- Use `framer-motion` variants for list staggers, row entries, and modal transitions.

### 8.1 `LandingPage.tsx` (public)

Public marketing landing. Renders `TopNav` with an `onLoginClick` callback, a hero headline, and three feature cards (Browse / Plan / Ask).

Hosts the **auth modal** — a single `Modal` that toggles between `login` and `register` modes. Notable details:

- The modal state can be opened either by the `Log in` button or by being redirected here with `location.state.openAuth === true` (that's how the `RequireAuth` guard triggers it).
- Register calls `registerApi` then flips the modal into `login` mode with a green success banner. It does **not** auto-login — the backend doesn't return a token on register, and requiring a conscious login step also surfaces invalid credentials early.
- Login uses `login(email, password)` from `useAuth()` and, on success, computes `safePostLoginPath(authLocationState?.from)` and navigates there with `replace: true`. The sanitizer rejects anything that:
  - doesn't start with `/`
  - starts with `//` (protocol-relative URL)
  - contains `..` (path traversal)
  - looks like a scheme (`foo:`)
  - doesn't start with `/app`
  ... and falls back to `/app`. This prevents open-redirect attacks where the `from` value in navigation state could be crafted to send users off-site.
- Form submission is gated by `canSubmit` (non-empty email + password, plus first/last name in register mode).

### 8.2 `AppShell.tsx` (authenticated layout)

Frame rendered inside `RequireAuth`. Owns:

- A sticky `TopNav`.
- A **desktop sidebar** (`md:` breakpoint) with workspace links (Builds / Catalog / Chat) and an `Admin` section that only renders if `state.user.role === 'admin'`.
- A **mobile bottom navigation bar** (`md:hidden`) mirroring the sidebar entries with tab-style icon buttons.
- The page outlet, wrapped in an `AnimatePresence` page-transition effect keyed on `location.pathname`.

The nav-link active state uses React Router's `NavLink` with a class-name callback so Tailwind can swap background and text color based on `isActive`.

### 8.3 `BuildsPage.tsx` — build grid

Lists the current user's builds as a responsive grid of cards (1 → 2 → 3 → 4 columns depending on breakpoint). Each card shows name, description, parts count, last-updated date, and total price.

Hover reveals three icon buttons (Edit / Clone / Delete) positioned absolutely in the card's top-right. They use `e.stopPropagation()` so clicking them doesn't also trigger the card's navigate-to-builder handler.

Mutations:

- `cloneMutation` — calls `cloneBuild`, invalidates `['builds']`, then `navigate(\`/app/builds/${cloned.id}\`)`. The clone becomes the user's next screen immediately.
- `deleteMutation` — triggered by `ConfirmDialog`, invalidates `['builds']`, clears the confirm target on success.
- `CreateBuildModal` — inline component that POSTs a new build and navigates straight to its editor.
- `EditBuildModal` — PATCHes name/description. Its form state is seeded from the selected `BuildSummary` via a subtle `if (build && !initialized)` pattern during render; this avoids an extra `useEffect` for what is effectively a reset-when-the-target-changes concern.

### 8.4 `BuilderPage.tsx` — build editor

The largest page by a wide margin. Inputs: the `:id` URL param (parsed to `buildId`). Data sources:

- `useQuery(['build', buildId], () => getBuild(...))` — the build with its parts.
- `useQuery(['part-types'], () => getPartTypes(...), { staleTime: Infinity })` — the slot registry (CPU, GPU, etc.). Frozen for the session.

Structure:

- **`BuildHeader`** — in-place edit of name/description via a toggleable form. Saves via `updateBuild`.
- **`PartSlot`** (rendered once per part type) — shows the category label, a list of existing rows, and an Add/Choose button. Quantity controls only render when `allow_multiple` is true; a Swap button renders when it's false (singular slots are replaced, not stacked).
- **`CatalogPickerModal`** — opens when the user clicks Add/Choose/Swap. Reuses the catalog API (`listCatalog`) with the selected category, and supports search, column sort (via the shared `ColumnDef` table metadata), and pagination. Picking an item either calls `addBuildPart` or `updateBuildPart({ part_id: newId })` depending on whether the caller was swapping. Both mutations share `keepPreviousData` so the table doesn't flash blank between pages.
- **Estimated Total** — a pill at the bottom summing `build.total_price` (the server computes this so we never risk drift between UI math and DB state).

All mutations funnel into `invalidateBuild()`, which invalidates both `['build', buildId]` (detail) and `['builds']` (list). This keeps the Builds grid's price/part-count instantly accurate after any edit, without refetching detail pages that aren't currently open.

### 8.5 `CatalogPage.tsx` — public-ish parts browser

Nine-category tabbed table view. Local state tracks: `category`, `page`, `search` (draft vs `submittedSearch` to avoid refetching on every keystroke), `minPrice`, `maxPrice`, `sortBy`, `order`, and a currently-open `detailItem`.

- The query key includes the full `queryParams` object so any filter change triggers a deterministic refetch: `['catalog', category, queryParams]`.
- `placeholderData: keepPreviousData` makes paging feel instant — the previous page's rows stay mounted until the new page arrives.
- Column sort is toggled via `toggleSort(key)` which flips `order` if the same column is clicked and resets `page` to 1 on every sort change.
- The detail modal reuses `CATEGORY_COLUMNS` to format known columns and falls back to `Key_Name → 'Key Name'` prettifying plus `String(value)` for anything else.
- **A deliberate quirk:** switching categories calls `resetFilters()` rather than preserving search text — otherwise a "Corsair" query from the PSU tab would still be applied on the GPU tab and confuse users.

### 8.6 `ChatPage.tsx` — AI chat

Split into three vertical regions at `lg` breakpoint: threads sidebar (left), conversation (center), composer (bottom of the conversation panel). On mobile, the sidebar collapses to a horizontal panel above the conversation.

State model:

- **URL is the source of truth for thread selection.** `?thread=<id>` picks a thread; no query param puts the UI in "draft new chat" mode. This makes chats shareable/bookmarkable and plays nicely with browser back.
- `wantsNewChatDraft` + `validSelectedId` combine into `isDraftNewChat`, which controls whether the center panel shows the welcome state or the message list. Hitting **New** in the sidebar clears `?thread=` and sets `wantsNewChatDraft = true`.
- `optimisticSend` — after the user submits, the UI shows their bubble immediately alongside a dashed assistant placeholder with a rotating status line (`AI_STATUS_MESSAGES`, cycled every 2.2s via a `setInterval` driven by `statusTick`). No real streaming — the backend returns the whole reply at once — but the rotating status makes multi-second waits feel intentional instead of broken.

Mutation plumbing:

- `sendMutation` handles **two** flows:
  - **Existing thread:** `postMessage(token, threadId, payload)`; on success, invalidate `['messages', 'all', threadId]` and `['threads']`.
  - **New-chat draft:** create a thread, best-effort `patchThread` with a derived title, then `postMessage` with the draft body. On any failure after the thread was created, it attempts `deleteThread` to avoid leaving orphan empty threads; if the cleanup also fails, the primary error is still what's surfaced.
- On success in draft mode it updates the URL with `setSearchParams({ thread: String(threadId) })` so the user is now in a real thread, not a draft.
- On error the draft text is restored so the user can retry without retyping.

Other features:

- Per-thread context menu: Rename (opens a `Modal` with a `TextField`) and Delete (opens `ConfirmDialog`).
- **Attach build** select — a dropdown of the user's builds that populates the `build_id` field of the message payload. Build attachment is per-message (matching the backend's `messages.build_id`), so the user can switch the build they're reasoning about mid-thread.
- **Message rendering.** The user's request is rendered as a plain right-aligned bubble. The AI reply is rendered through `AiMarkdown` (§9.3).
- **Auto-scroll.** An `endRef` at the bottom of the list is scrolled into view whenever messages update, when the optimistic send toggles, or when the status tick advances — so the newest reply is always visible.
- **Quick prompts.** In the empty draft state, three suggested prompts populate the draft when clicked, for onboarding.
- Composer: `<textarea>` with `maxLength=32000` (matching the backend guardrail), `Shift+Enter` for newlines, plain Enter to send, and a character counter. The send button is a paper-plane icon.

### 8.7 `AdminUsersPage.tsx`

Table of users paginated `PAGE_SIZE=20` at a time. Columns: full name, email, role (as a badge), join date, actions.

- **Role toggle** — a `ghost` Button that calls `changeUserRole(token, userId, role === 'admin' ? 'user' : 'admin')`. Loading state is scoped to the specific row via `roleMutation.variables?.userId === user.id`.
- **Self-protection** — the row for the currently authenticated admin shows "You" instead of the toggle button, so an admin can't accidentally demote themselves. This is a client-side guard only; the backend enforces the real rule.
- **`CreateUserModal`** — full user creation (email, password, first/last name, role pills). Client-side validation requires password length ≥ 8; the submit button stays disabled otherwise. Server errors are rendered inline as a red banner.

### 8.8 `errors/ErrorPage.tsx`

Router-level error fallback. Calls `useRouteError()`, discriminates `isRouteErrorResponse` (e.g. 404 from a nonexistent route) vs generic `Error`, and renders a styled card with a "Go home" link.

---

## 9. Shared UI Components

### 9.1 `Button` (`components/ui/Button.tsx`)

Three variants — `primary` (brand blue), `secondary` (ink), `ghost` (transparent with hover surface). Accepts `loading` which both disables the button and swaps the children for a `"Loading…"` label. Every variant carries Tailwind's `disabled:` styles so a disabled state is visually distinct without extra props.

### 9.2 `Modal` + `ConfirmDialog`

`Modal` (`components/ui/Modal.tsx`) is the app's only dialog primitive:

- Renders inside `<AnimatePresence>` with a scale+fade spring transition.
- Backdrop is a `<motion.button>` that closes on click (so it's keyboard-operable — Escape is also bound via a window listener that's attached only while `open`).
- `role="dialog"` + `aria-modal="true"` + `aria-label={title}` for screen readers.
- Three sizes: `md` (`max-w-md`), `lg` (`max-w-2xl`), `xl` (`max-w-5xl`). The catalog picker in the builder uses `xl`; confirm dialogs use `md`.

`ConfirmDialog` (`components/ui/ConfirmDialog.tsx`) is a thin wrapper around `Modal` for destructive/confirm flows. Defaults to `variant='danger'` which styles the confirm button red; `variant='default'` uses brand blue. Labels default to "Delete"/"Confirm" and are overridable. The whole dialog refuses to close while `loading === true` so accidental clicks on the backdrop during a pending delete don't dismiss the mutation state.

This is the app-wide replacement for `window.confirm`, both for styling consistency and because `window.confirm` blocks the event loop in a way that interferes with TanStack Query timers.

### 9.3 `AiMarkdown` (`components/chat/AiMarkdown.tsx`)

`ReactMarkdown` with `remark-gfm` (GitHub-flavored markdown: tables, strikethrough, task lists) and a custom `components` map that styles every common Markdown node to match the chat bubble's visual language:

- Headings collapse to `h3`/`h4`-sized visual weight, since they appear inside a small bubble.
- Lists use brand-colored markers.
- Inline code gets a mist-chip background; block code gets an ink-black shell with `overflow-x-auto`.
- Links open in a new tab with `rel="noopener noreferrer"`.

There's also a small `sanitizeAiText` pre-processor that strips stray trailing timestamps that the model occasionally appends to its output — a cosmetic fix for a recurring model quirk. No HTML sanitation is needed; `react-markdown` doesn't render raw HTML unless `rehype-raw` is enabled, and we deliberately don't use it.

### 9.4 `TextField`

Labeled input with optional `error` prop that swaps the border to red and renders the message below. Exposes a `rightSlot` ReactNode for future icons/buttons but nothing uses it today — kept for symmetry with the password-toggle-eye pattern we'd add in a follow-up.

### 9.5 `TopNav`

Sticky header rendered on both public and authenticated screens. Accepts an optional `onLoginClick` — supplied by `LandingPage` to open the auth modal; on authenticated screens, the button is replaced by the user's name + a Log out button. The login/logout button is the same shape but swaps variant and target so the navbar height never shifts when the auth state flips.

---

## 10. Data Flow & State Management

### 10.1 TanStack Query as the server cache

Every server-backed view is a `useQuery` keyed by the parameters that identify it:

| Key | Source | Notes |
| --- | --- | --- |
| `['auth', 'me', token]` | AuthProvider | Token-scoped so account switches invalidate naturally |
| `['builds']` | BuildsPage, ChatPage | ChatPage reuses the same key so opening /app/chat with builds already cached is instant |
| `['build', buildId]` | BuilderPage | Invalidated on every part mutation |
| `['part-types']` | BuilderPage | `staleTime: Infinity` — registry is session-constant |
| `['catalog', category, queryParams]` | CatalogPage | `keepPreviousData` for smooth pagination |
| `['catalog-picker', category, queryParams]` | BuilderPage picker modal | Separate key so list browsing and slot-picking don't evict each other |
| `['threads', size]` | ChatPage | Size included so paging never cross-pollutes |
| `['messages', 'all', threadId]` | ChatPage | Aggregated (multi-page) result |
| `['admin', 'users', page, size]` | AdminUsersPage | Page-scoped |

Mutations always follow the pattern: `useMutation(fn, { onSuccess: () => qc.invalidateQueries({ queryKey: [...] }) })`. Invalidation is preferred over manual `setQueryData` because the server is the source of truth for computed fields (`total_price`, `line_total`, `parts_count`) — writing stale locals risks drift.

### 10.2 Local UI state

Everything that isn't server state lives in `useState`:

- Modal open/close, selected item to confirm delete, selected row to edit.
- Draft text in composers and search bars (search draft vs submitted search — critical for not refetching on every keystroke).
- Pagination cursors and sort/order choices.
- Optimistic send markers in the chat.

There is **no** Redux, Zustand, or context-based global UI store. Prop drilling is one level deep at most because pages compose their own modals inline.

### 10.3 URL state

Two places use the URL as state:

- **Chat thread selection** — `?thread=<id>` (see §8.6). Switching threads is a `setSearchParams`, not `navigate`, which keeps the user on `/app/chat` and avoids triggering the `AppShell` page transition.
- **Build editor** — `/app/builds/:id`. The id is parsed from the route params and powers every query on the page.

Everything else (filters, sort, pagination) is component state that resets when the page unmounts. This is deliberate — the app is small enough that preserving filter state in the URL would be more noise than value.

---

## 11. Error Handling

A consistent three-layer model:

1. **Network-layer errors** → `ApiError` (see §6.1). Every page that surfaces an error checks `err instanceof ApiError` and uses `err.message` (already run through `formatApiErrorDetail`) as the display text, with a generic fallback otherwise.
2. **Auth errors (401/403)** → intercepted by the `AuthProvider`; the user is logged out via `queueMicrotask(logout)` and the next render redirects through the guards.
3. **Routing/unexpected errors** → caught by React Router's `errorElement={<ErrorPage />}`.

Inline error UI uses a consistent Tailwind pattern: `rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700` with `role="alert"`. For success banners it's the same shape with green classes.

Loading UI is handled through small animated skeleton blocks (`h-* rounded-xl bg-mist-100` with a `framer-motion` pulse). These keep layout height stable so content arriving doesn't cause visible shifts.

---

## 12. Animation & Motion

`framer-motion` is used throughout but intentionally kept restrained:

- **Stagger animations** on list mount (builds grid, admin users table, catalog rows, thread list) — `staggerChildren: 0.02–0.1` seconds.
- **Spring transitions** on cards lifting on hover (`whileHover={{ y: -4 }}`) and on modal enter/exit.
- **Page transitions** in `AppShell` — fade + vertical translate keyed on `location.pathname`.
- **Skeleton pulses** — animated opacity `[0.4, 0.7, 0.4]` with a 1.4s loop.

The motion budget is small by design: every animation is < 400ms, and nothing blocks interaction.

---

## 13. Configuration & Environment

- `.env.example` documents `VITE_API_BASE_URL`. The real `.env` (not committed) overrides it for local dev. In production, set the var at build time — Vite inlines `import.meta.env.*` constants into the bundle.
- No feature flags, no runtime config file — the frontend only has one environment-dependent value.
- The `console.warn` in `lib/api/client.ts` fires once if the var is missing, so forgetting the `.env` in local dev is loud instead of silent (all requests would otherwise hit the current origin and 404).

---

## 14. Accessibility Notes

- Modals set `role="dialog"`, `aria-modal="true"`, and an `aria-label={title}`.
- The backdrop is a real `<button>` with `aria-label="Close modal"` so screen readers can activate it.
- Every icon-only button (top-right close, row actions, chat context menu) has an `aria-label`.
- Color contrast in the palette was chosen against WCAG AA on the ink/mist/brand combinations used for body text.
- There is no keyboard focus trap in `Modal` — a known gap, tracked in §16.

---

## 15. Security Notes

- **JWT in `localStorage`** — documented in §5.1. The trade-off is accepted because this app has no cookie infrastructure and the XSS surface is small (no `dangerouslySetInnerHTML`, no user-generated HTML, Markdown rendering without raw-HTML plugins).
- **Open redirects** are blocked by `safePostLoginPath`. Only `/app*` paths survive the filter.
- **CORS/CSRF** — the app makes only bearer-authenticated fetches and sends no cookies, so CSRF is not applicable.
- **Admin self-demotion** is prevented in the UI (see §8.7) but the backend is the real enforcement point.
- **Chat content.** The assistant response is rendered as Markdown — `react-markdown` by default escapes HTML. The user's own request is rendered as plain text inside a `<p className="whitespace-pre-wrap">`, which React escapes automatically.

---

## 16. Future Work

Captured here so they aren't rediscovered:

- **Route-level code splitting.** Every page is imported eagerly at the router. For a small SPA this is fine; once the bundle crosses ~500 KB gzipped it should be migrated to `React.lazy` per route.
- **Focus trap in `Modal`.** Today, Tab can move focus behind the backdrop. A future `Modal` revision should integrate a focus-scope library (e.g. `@radix-ui/react-focus-scope`) or implement one manually.
- **Streaming AI responses.** The backend returns complete replies; if it switches to SSE/HTTP streaming, `ChatPage.sendMutation` and `AiMarkdown` need incremental-update support.
- **Offline / optimistic write.** Mutations currently have no offline queue and no optimistic UI beyond the chat send indicator. Builds-page operations could optimistically update `['builds']` before the network returns.
- **URL state for filters.** Catalog filters and sort currently reset on reload. Mirroring them into the query string would make catalog links shareable.
- **Self-profile edit UI.** `updateProfile` is wired up in `features/users/users.api.ts` but no page calls it yet; the obvious home is a `/app/settings` route.
- **Test suite.** No Vitest/Playwright coverage exists today. A first pass should focus on the guards (`RequireAuth`/`RequireAdmin`), the `safePostLoginPath` allow-list, and the `formatApiErrorDetail` string-coercion branches.
- **i18n.** All user-facing strings are hardcoded English. Moving them to a message catalog is straightforward but not yet justified.
