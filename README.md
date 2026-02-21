# MangaPrompt

MangaPrompt is an Expo + React Native app that lets a user generate a full manga from a single text prompt.

The generation flow is:
1. Generate a structured manga plan (title, characters, pages, panels).
2. Generate one character image per character.
3. Generate one page image per manga page with character references.
4. Build a PDF from generated page images.

## Stack

- Expo / React Native / TypeScript
- Supabase Auth + `profiles` table credits
- Replicate API for text and image generation

## Prerequisites

- Node.js 18+
- npm
- A Supabase project
- A Replicate API key

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create local env file:

```bash
cp .env.example .env
```

3. Fill required variables in `.env`:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_REPLICATE_API_KEY`

4. Start the app:

```bash
npm run start
```

## Credits model

Image generation consumes credits from Supabase:
- Credits are read from `profiles.credits`.
- Each successful image generation decrements credits by 1.
- If credits are 0, generation returns an error.

## Generation pipeline implementation

The main orchestration lives in:

- `/Users/verdoyant/dev/MangaPrompt/functions/process.ts`

Use `processMangaGeneration(prompt, totalPages)` to run the full pipeline.

Example:

```ts
import { processMangaGeneration } from "@/functions/process";

const result = await processMangaGeneration(
  "A young swordswoman protects a floating city from mechanical dragons.",
  6,
);

if (!result.ok) {
  console.error(result.stage, result.error);
  return;
}

console.log(result.data.pageImageUrls); // all generated page image URLs
console.log(result.data.pdfLocalUri); // local URI to generated PDF
```

Success result shape:

```ts
{
  ok: true,
  data: {
    title: string;
    plan: MangaOutput;
    characters: {
      index: number;
      name: string;
      description: string;
      imageUrl: string;
    }[];
    pageImageUrls: string[];
    pdfLocalUri: string;
  };
}
```

Failure result shape:

```ts
{
  ok: false,
  stage: "validation" | "plan" | "characters" | "pages" | "pdf" | "unexpected";
  error: string;
}
```

## PDF generation note

`process.ts` uses `expo-print` at runtime for PDF export.

If not installed yet:

```bash
npx expo install expo-print
```

## Useful scripts

- `npm run start` - start dev server
- `npm run ios` - run on iOS simulator/device
- `npm run android` - run on Android
- `npm run web` - run on web
- `npm run lint` - run lint checks
