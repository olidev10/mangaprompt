import { generateCharacter, generatePage } from "@/functions/generateImage";
import { generatePlan, type MangaOutput } from "@/functions/generateText";
import * as Print from "expo-print";

type CharacterGeneration = {
  index: number;
  name: string;
  description: string;
  imageUrl: string;
};

export type ProcessMangaSuccess = {
  ok: true;
  data: {
    title: string;
    plan: MangaOutput;
    characters: CharacterGeneration[];
    pageImageUrls: string[];
    pdfLocalUri: string;
  };
};

export type ProcessMangaFailure = {
  ok: false;
  stage: "plan" | "characters" | "pages" | "pdf" | "validation" | "unexpected";
  error: string;
};

export type ProcessMangaResult = ProcessMangaSuccess | ProcessMangaFailure;

const toPagePrompt = (
  page: MangaOutput["pages"][number],
  plan: MangaOutput,
): string => {
  const panelLines = page.panels
    .sort((a, b) => a.index - b.index)
    .map((panel) => `Panel ${panel.index + 1}: ${panel.description}`)
    .join("\n");

  const charactersMentioned = new Set<number>();
  for (const panel of page.panels) {
    for (const characterIndex of panel.characters ?? []) {
      charactersMentioned.add(characterIndex);
    }
  }

  const characterContext = [...charactersMentioned]
    .map((characterIndex) =>
      plan.characters.find((c) => c.index === characterIndex),
    )
    .filter(
      (character): character is MangaOutput["characters"][number] =>
        !!character,
    )
    .map((character) => `- ${character.name}: ${character.description}`)
    .join("\n");

  return [
    `Create manga page ${page.index + 1} of "${plan.title}".`,
    "Keep character consistency with references.",
    characterContext.length > 0
      ? `Characters on this page:\n${characterContext}`
      : "",
    `Panels:\n${panelLines}`,
  ]
    .filter(Boolean)
    .join("\n\n");
};

const toPdfHtml = (title: string, pageImageUrls: string[]) => {
  const pagesMarkup = pageImageUrls
    .map(
      (url, i) => `
      <section class="page">
        <img src="${url}" alt="Manga page ${i + 1}" />
      </section>`,
    )
    .join("");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>
      @page { size: A4; margin: 0; }
      html, body {
        margin: 0;
        padding: 0;
        background: #000;
      }
      .page {
        page-break-after: always;
        width: 100%;
        height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #000;
      }
      .page:last-child { page-break-after: auto; }
      img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
    </style>
  </head>
  <body>${pagesMarkup}</body>
</html>`;
};

const getCharacterIndexesForPage = (page: MangaOutput["pages"][number]) => {
  const indexes = new Set<number>();
  for (const panel of page.panels) {
    for (const characterIndex of panel.characters ?? []) {
      indexes.add(characterIndex);
    }
  }
  return [...indexes];
};

/**
 * Pipeline:
 * 1) Generate structured plan
 * 2) Generate character sheets
 * 3) Generate each manga page from panel descriptions + character refs
 * 4) Convert page images to local PDF
 */
export async function processMangaGeneration(
  prompt: string,
  totalPages: number,
): Promise<ProcessMangaResult> {
  try {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      return {
        ok: false,
        stage: "validation",
        error: "Prompt cannot be empty.",
      };
    }

    if (!Number.isInteger(totalPages) || totalPages < 1) {
      return {
        ok: false,
        stage: "validation",
        error: "totalPages must be a positive integer.",
      };
    }

    const planResult = await generatePlan(trimmedPrompt, totalPages);
    if (!planResult.ok) {
      return {
        ok: false,
        stage: "plan",
        error: planResult.error,
      };
    }

    const plan = planResult.data;

    const characters: CharacterGeneration[] = [];
    for (const character of plan.characters.sort((a, b) => a.index - b.index)) {
      const characterResult = await generateCharacter(
        character.name,
        character.description,
      );

      if (!characterResult.imageUrl) {
        return {
          ok: false,
          stage: "characters",
          error:
            characterResult.error ??
            `Failed to generate character image for ${character.name}.`,
        };
      }

      characters.push({
        index: character.index,
        name: character.name,
        description: character.description,
        imageUrl: characterResult.imageUrl,
      });
    }

    const pageImageUrls: string[] = [];
    for (const page of plan.pages.sort((a, b) => a.index - b.index)) {
      const pageCharacterIndexes = getCharacterIndexesForPage(page);
      const referenceImages = pageCharacterIndexes
        .map((characterIndex) =>
          characters.find((character) => character.index === characterIndex),
        )
        .filter((character): character is CharacterGeneration => !!character)
        .map((character) => character.imageUrl);

      const pageResult = await generatePage(
        toPagePrompt(page, plan),
        referenceImages,
      );

      if (!pageResult.imageUrl) {
        return {
          ok: false,
          stage: "pages",
          error:
            pageResult.error ??
            `Failed to generate image for page ${page.index + 1}.`,
        };
      }

      pageImageUrls.push(pageResult.imageUrl);
    }

    try {
      const html = toPdfHtml(plan.title, pageImageUrls);
      const pdf = await Print.printToFileAsync({
        html,
        base64: false,
      });

      if (!pdf?.uri) {
        return {
          ok: false,
          stage: "pdf",
          error: "PDF generation did not return a local URI.",
        };
      }

      return {
        ok: true,
        data: {
          title: plan.title,
          plan,
          characters,
          pageImageUrls,
          pdfLocalUri: pdf.uri,
        },
      };
    } catch (error) {
      return {
        ok: false,
        stage: "pdf",
        error:
          "PDF generation failed. Install expo-print (`npx expo install expo-print`) and try again. " +
          (error instanceof Error ? error.message : String(error)),
      };
    }
  } catch (error) {
    return {
      ok: false,
      stage: "unexpected",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
