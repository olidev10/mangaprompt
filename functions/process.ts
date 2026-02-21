import { generateCharacter, generatePage } from "@/functions/generateImage";
import { generatePlan, type MangaOutput } from "@/functions/generateText";
import * as Print from "expo-print";

type CharacterGeneration = {
  index: number;
  name: string;
  description: string;
  imageUrl: string;
};

export type ProcessLogStage =
  | "validation"
  | "plan"
  | "characters"
  | "pages"
  | "pdf"
  | "done"
  | "unexpected";

export type ProcessLog = {
  id: string;
  stage: ProcessLogStage;
  message: string;
  createdAt: string;
};

export type ProcessProgressEvent = ProcessLog & {
  pageImageUrl?: string;
  pageIndex?: number;
};

export type ProcessMangaOptions = {
  onProgress?: (event: ProcessProgressEvent) => void;
};

export type ProcessMangaSuccess = {
  ok: true;
  data: {
    title: string;
    plan: MangaOutput;
    characters: CharacterGeneration[];
    pageImageUrls: string[];
    pdfLocalUri: string;
    logs: ProcessLog[];
  };
};

export type ProcessMangaFailure = {
  ok: false;
  stage: "plan" | "characters" | "pages" | "pdf" | "validation" | "unexpected";
  error: string;
  logs: ProcessLog[];
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

const createProgressLog = (
  logs: ProcessLog[],
  onProgress: ProcessMangaOptions["onProgress"],
  stage: ProcessLogStage,
  message: string,
  extras?: Pick<ProcessProgressEvent, "pageImageUrl" | "pageIndex">,
) => {
  const event: ProcessProgressEvent = {
    id: `${Date.now()}-${logs.length + 1}`,
    stage,
    message,
    createdAt: new Date().toISOString(),
    ...(extras ?? {}),
  };

  logs.push({
    id: event.id,
    stage: event.stage,
    message: event.message,
    createdAt: event.createdAt,
  });

  onProgress?.(event);
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
  options: ProcessMangaOptions = {},
): Promise<ProcessMangaResult> {
  const logs: ProcessLog[] = [];

  try {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      createProgressLog(
        logs,
        options.onProgress,
        "validation",
        "Prompt cannot be empty.",
      );
      return {
        ok: false,
        stage: "validation",
        error: "Prompt cannot be empty.",
        logs,
      };
    }

    if (!Number.isInteger(totalPages) || totalPages < 1) {
      createProgressLog(
        logs,
        options.onProgress,
        "validation",
        "Page count must be a positive integer.",
      );
      return {
        ok: false,
        stage: "validation",
        error: "totalPages must be a positive integer.",
        logs,
      };
    }

    createProgressLog(
      logs,
      options.onProgress,
      "plan",
      "Generating manga plan...",
    );

    const planResult = await generatePlan(trimmedPrompt, totalPages);
    if (!planResult.ok) {
      createProgressLog(
        logs,
        options.onProgress,
        "plan",
        `Failed to generate plan: ${planResult.error}`,
      );
      return {
        ok: false,
        stage: "plan",
        error: planResult.error,
        logs,
      };
    }

    const plan = planResult.data;
    createProgressLog(
      logs,
      options.onProgress,
      "plan",
      `Plan ready: \"${plan.title}\" with ${plan.characters.length} characters.`,
    );

    const characters: CharacterGeneration[] = [];
    const sortedCharacters = [...plan.characters].sort(
      (a, b) => a.index - b.index,
    );

    for (const character of sortedCharacters) {
      createProgressLog(
        logs,
        options.onProgress,
        "characters",
        `Generating character ${character.index + 1}/${sortedCharacters.length}: ${character.name}`,
      );

      const characterResult = await generateCharacter(
        character.name,
        character.description,
      );

      if (!characterResult.imageUrl) {
        const error =
          characterResult.error ??
          `Failed to generate character image for ${character.name}.`;

        createProgressLog(
          logs,
          options.onProgress,
          "characters",
          `Character generation failed: ${error}`,
        );

        return {
          ok: false,
          stage: "characters",
          error,
          logs,
        };
      }

      characters.push({
        index: character.index,
        name: character.name,
        description: character.description,
        imageUrl: characterResult.imageUrl,
      });

      createProgressLog(
        logs,
        options.onProgress,
        "characters",
        `Character ready: ${character.name}`,
      );
    }

    const sortedPages = [...plan.pages].sort((a, b) => a.index - b.index);
    const pageImageUrls: string[] = [];

    for (const page of sortedPages) {
      createProgressLog(
        logs,
        options.onProgress,
        "pages",
        `Generating page ${page.index + 1}/${sortedPages.length}`,
        { pageIndex: page.index },
      );

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
        const error =
          pageResult.error ??
          `Failed to generate image for page ${page.index + 1}.`;

        createProgressLog(
          logs,
          options.onProgress,
          "pages",
          `Page generation failed on page ${page.index + 1}: ${error}`,
          { pageIndex: page.index },
        );

        return {
          ok: false,
          stage: "pages",
          error,
          logs,
        };
      }

      pageImageUrls.push(pageResult.imageUrl);

      createProgressLog(
        logs,
        options.onProgress,
        "pages",
        `Page ${page.index + 1} ready.`,
        { pageImageUrl: pageResult.imageUrl, pageIndex: page.index },
      );
    }

    try {
      createProgressLog(logs, options.onProgress, "pdf", "Building PDF...");
      const html = toPdfHtml(plan.title, pageImageUrls);
      const pdf = await Print.printToFileAsync({
        html,
        base64: false,
      });

      if (!pdf?.uri) {
        createProgressLog(
          logs,
          options.onProgress,
          "pdf",
          "PDF generation did not return a local URI.",
        );
        return {
          ok: false,
          stage: "pdf",
          error: "PDF generation did not return a local URI.",
          logs,
        };
      }

      createProgressLog(
        logs,
        options.onProgress,
        "done",
        "Manga generation complete.",
      );

      return {
        ok: true,
        data: {
          title: plan.title,
          plan,
          characters,
          pageImageUrls,
          pdfLocalUri: pdf.uri,
          logs,
        },
      };
    } catch (error) {
      const message =
        "PDF generation failed." +
        (error instanceof Error ? error.message : String(error));

      createProgressLog(logs, options.onProgress, "pdf", message);

      return {
        ok: false,
        stage: "pdf",
        error: message,
        logs,
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    createProgressLog(logs, options.onProgress, "unexpected", message);

    return {
      ok: false,
      stage: "unexpected",
      error: message,
      logs,
    };
  }
}
