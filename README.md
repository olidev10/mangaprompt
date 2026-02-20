# Expo + Supabase Starter Template

A minimal starter for Expo apps using Supabase authentication.

Included out of the box:
- Login + signup screen
- Auth state handling with Supabase session listener
- Two tab screens: `Home` and `Profile`
- Profile sign-out action

## 1. Install dependencies

```bash
npm install
```

## 2. Configure environment variables

Create a `.env` file in the project root:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

These values are available in Supabase dashboard:
- `Settings` -> `API` -> `Project URL`
- `Settings` -> `API` -> `anon public`

## 3. Start the app

```bash
npm run start
```

Then open on iOS, Android, or web from the Expo CLI menu.

## Project Structure

- `src/app/index.tsx`: auth gate and initial redirect
- `src/app/auth.tsx`: login/signup screen
- `src/app/(tabs)/index.tsx`: Home tab
- `src/app/(tabs)/profile.tsx`: Profile tab with sign out
- `hooks/useAuth.ts`: shared auth session hook
- `src/lib/supabase.ts`: Supabase client

## Notes

- If email confirmation is enabled in Supabase, users must verify email before first login.
- This is intentionally minimal so you can start shipping quickly.
