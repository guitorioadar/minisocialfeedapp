# Mini Social Feed App

A lightweight social media app where users can post text updates, like, comment, and receive real-time push notifications. Monorepo with a Node.js backend and a React Native (Expo) mobile app.

---

## Tech Stack

### Backend

- **TypeScript + Express** — API server. TypeScript is used across the entire backend for type safety at compile time.
- **Prisma + PostgreSQL** — ORM and database. Prisma handles migrations, type-safe queries, and relation modeling. PostgreSQL was chosen because the data is relational (users → posts → likes/comments).
- **Zod** — Runtime request validation. Every route that accepts a body/query/params has a Zod schema. A `validate` middleware parses the request against the schema before it hits the controller, so controllers never deal with malformed input.
- **JWT (jsonwebtoken)** — Stateless auth. On signup/login the server signs a token with `{ userId, email }`. The `authenticate` middleware verifies it on every protected route. Token expiry is configurable via `JWT_EXPIRES_IN`.
- **bcryptjs** — Password hashing (10 salt rounds). Passwords are never stored in plain text.
- **Firebase Admin SDK** — Server-side push notifications via FCM. When a user likes or comments on someone else's post, the service layer fires a push to all of the post author's registered FCM tokens. Invalid tokens are cleaned up automatically after a failed send.
- **Helmet** — Sets security-related HTTP headers.
- **express-rate-limit** — Available for rate limiting (dependency installed).
- **Morgan** — HTTP request logging in dev mode.
- **PM2** — Production process manager. `ecosystem.config.js` is preconfigured with log rotation and auto-restart.
- **Prisma Singleton** — `config/prisma.ts` uses a global singleton to avoid creating multiple Prisma clients during hot reloads in development.

### Mobile (React Native + Expo)

- **Expo SDK 54 + Expo Router v6** — File-based routing. The `app/` directory maps directly to routes: `(auth)/` group for login/signup, `(app)/` group for the main tab navigator, and `post/[id].tsx` for the detail screen.
- **React Query (TanStack Query v5)** — Server state management. Feed uses `useInfiniteQuery` for paginated loading with `getNextPageParam`. Likes use `useMutation` with **optimistic updates** — the cache is updated instantly on tap, and rolled back if the server call fails. This makes the like interaction feel instant.
- **Zustand** — Client-side auth state. A single `authStore` holds `token`, `user`, and `isAuthenticated`. It syncs to `expo-secure-store` on every change so auth persists across app restarts.
- **Axios** — HTTP client with interceptors. The request interceptor attaches the Bearer token from the Zustand store. The response interceptor catches 401s and auto-clears local auth (with a guard to skip auth endpoints and prevent recursive logout loops).
- **Expo Secure Store** — Token and user data persistence. Used instead of AsyncStorage because it encrypts values in the device keychain.
- **@react-native-firebase/messaging** — Receives FCM push notifications. On app startup, the token is registered with the backend. A token refresh listener re-registers automatically. Foreground messages are displayed via `expo-notifications` as local notifications.
- **expo-haptics** — Haptic feedback on like tap for tactile response.
- **Expo Notifications** — Handles foreground notification display and notification permission requests. Works alongside Firebase messaging.
- **Theme Constants** — Centralized colors, spacing, and font sizes in `constants/theme.ts`. Includes an `isTablet()` helper — the feed renders in a 2-column grid on tablets vs single column on phones.

---

## Backend Architecture

The backend follows a **modular pattern**: each feature (auth, posts, likes, comments, notifications) is a module with its own `routes → controller → service` files. Routes define endpoints and attach middleware (auth, validation). Controllers parse the request and call the service. Services contain all business logic and database calls. This keeps each layer testable and swappable.

### Key Design Decisions

**Standardized API responses** — Every response goes through `utils/apiResponse.ts` which enforces a consistent shape: `{ success, message, data }` for single results and adds a `pagination` object for lists. The frontend relies on this shape.

**Centralized error handling** — A global `errorHandler` middleware catches Zod validation errors (400), Prisma unique constraint violations (409), Prisma record-not-found (404), JWT errors (401), and falls back to 500. Controllers just `next(error)` and never format error responses themselves.

**Environment validation** — `config/env.ts` validates all env vars with Zod at startup. If `DATABASE_URL` or `JWT_SECRET` is missing, the server exits immediately with a clear error instead of crashing later at runtime.

**Like toggle** — `POST /posts/:id/like` is a single endpoint that toggles. It checks for an existing like using Prisma's compound unique constraint `@@unique([userId, postId])` and either creates or deletes. No separate unlike endpoint needed.

**Notifications are fire-and-forget** — `sendLikeNotification` and `sendCommentNotification` are called with `.catch()` so a failed push never blocks or errors the main request. Self-interactions (liking your own post) don't trigger notifications.

**FCM token cleanup** — After each multicast send, the service checks for `registration-token-not-registered` errors and deletes stale tokens from the database.

**Logout clears FCM tokens** — When a user logs out, all their FCM tokens are deleted server-side so they stop receiving push notifications on that device.

---

## Mobile Architecture

**Routing** — Expo Router uses layout groups: `(auth)` for unauthenticated screens (login, signup, forgot-password, verify-otp, reset-password) and `(app)` for the authenticated tab navigator (feed, create-post). The root `_layout.tsx` watches `isAuthenticated` from the Zustand store and redirects accordingly.

**Likes** — The `PostCard` component's like mutation uses `onMutate` to immediately flip `isLikedByMe` and update `likeCount` in the React Query cache across all query keys. On error, it rolls back from a snapshot. This avoids waiting for the round-trip.

**Infinite scroll** — The feed uses `useInfiniteQuery` with `onEndReached` on the FlatList. `getNextPageParam` returns `undefined` when on the last page, which stops further fetching.

**Post detail reads from cache** — `post/[id].tsx` doesn't make a separate API call for the post. It reads the post from the React Query cache using `queryClient.getQueryData` across all `['posts']` queries. Comments are fetched separately.

**401 auto-logout** — The Axios response interceptor detects 401 errors, clears the Zustand store and secure storage, and lets Expo Router's auth guard redirect to login. Auth endpoints are excluded to prevent logout loops when login itself returns 401 for bad credentials.

**Notification tap navigation** — When a user taps a push notification (from foreground, background or quit state), `handleNotificationNavigation` routes to `/post/${postId}` so the user lands on the relevant post.

---

## API Endpoints

All routes except auth are protected (require `Authorization: Bearer <token>`).

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create account (username, email, password) |
| POST | `/api/auth/login` | Login (email, password) → returns JWT |
| POST | `/api/auth/logout` | Logout (clears FCM tokens) |
| POST | `/api/auth/forgot-password` | Request password reset OTP |
| POST | `/api/auth/verify-otp` | Verify OTP → returns reset token |
| POST | `/api/auth/reset-password` | Reset password with reset token |
| POST | `/api/posts` | Create a text post |
| GET | `/api/posts` | Get paginated feed (`?page=1&limit=20&username=`) |
| POST | `/api/posts/:id/like` | Toggle like on a post |
| POST | `/api/posts/:id/comment` | Add a comment to a post |
| GET | `/api/posts/:id/comments` | Get paginated comments for a post |
| POST | `/api/notifications/register-token` | Register FCM device token |

---

## Database Schema

Five models: **User**, **Post**, **Like**, **Comment**, **FcmToken**.

- `Like` has a compound unique on `[userId, postId]` to prevent duplicate likes.
- `Post` is indexed on `createdAt DESC` for fast feed queries.
- `Comment` is indexed on `[postId, createdAt DESC]` for fast per-post comment listing.
- `FcmToken` stores one row per device per user. `token` is unique to avoid duplicates.
- All relations use `onDelete: Cascade` — deleting a user removes all their posts, likes, comments, and tokens.

---

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL
- Firebase project with Cloud Messaging enabled
- Expo CLI (`npm install -g expo-cli`)

### Backend

```bash
cd backend
cp .env.backend .env
# File can be found in the email sent to you
# Update the DATABASE_URL in .env with your local PostgreSQL credentials
# e.g. postgresql://user:password@localhost:5432/minisocialfeed?schema=public

# Note: If you use the default DATABASE_URL PostgreSQL credentials, you can leave generate,migrate,seed commands as they are.

yarn
yarn prisma:generate # For Local, this will generate the Prisma Client
yarn prisma:migrate  # This will create the database schema
yarn prisma:seed     # This will seed the database with initial data
yarn dev          # starts on port 4000
```

For production:
```bash
yarn build
yarn pm2:start    # runs compiled JS via PM2
```

### Mobile

```bash
cd mobile
cp .env.example .env
# Set EXPO_PUBLIC_API_URL to your backend URL (e.g. http://<your-ip>:4000/api)

yarn
yarn android:dev # or yarn ios:dev
```

To build a release APK:
```bash
cd android && ./gradlew assembleRelease
```

### Environment Variables

**Backend** (`.env`):
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWTs |
| `JWT_EXPIRES_IN` | Token expiry (default: `7d`) |
| `PORT` | Server port (default: `4000`) |
| `NODE_ENV` | `development` / `production` |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Firebase service account JSON (stringified). Optional — notifications are disabled if not set. |

**Mobile** (`.env`):
| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_API_URL` | Backend API base URL (e.g. `http://192.168.x.x:4000/api`) |

---

## Postman Collection

A Postman collection is included at the root: `Mini_Social_Feed_API.postman_collection.json`. Import it to test all endpoints.
