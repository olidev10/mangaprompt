# Expo + Supabase Auth Starter

This project is made to help you quickly bootstrap a mobile/web app with:
- Expo Router navigation
- Supabase email/password authentication
- Auth-protected app screens
- A clean starting structure for building real product features

It is a starter app, not a finished product. The goal is to remove setup friction so you can start building your own app logic immediately.

## What this project includes

- `app/auth.tsx`: login and sign-up screen
- `contexts/auth-context.tsx`: auth session state + sign-out
- `app/_layout.tsx`: route protection and redirect logic
- `app/(tabs)/home.tsx`: example authenticated home screen
- `app/(tabs)/profile.tsx`: example profile screen with sign-out
- `lib/supabase.ts`: Supabase client initialization

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Create `.env` in the project root:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

3. Start the app:

```bash
npm run start
```

From the Expo CLI, run on iOS, Android, or web.

## Who this is for

- Developers starting a new Expo app that needs auth
- Teams that want a simple Supabase auth baseline
- Anyone who wants to skip boilerplate and move straight to product features
