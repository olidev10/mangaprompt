import { generateCharacter, generatePage } from "@/functions/generateImage";
import { generatePlan, type MangaOutput } from "@/functions/generateText";
import type { TablesInsert, TablesUpdate } from "@/lib/database";
import { supabase } from "@/lib/supabase";

type CharacterGeneration = {
  index: number;
  name: string;
  description: string;
  imageUrl: string;
};

export type ProcessLogStage =
  | "validation"
  | "project"
  | "plan"
  | "characters"
  | "pages"
  | "storage"
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
    projectId: number;
    title: string;
    plan: MangaOutput;
    characters: CharacterGeneration[];
    pageImageUrls: string[];
    logs: ProcessLog[];
  };
};

export type ProcessMangaFailure = {
  ok: false;
  stage:
    | "validation"
    | "project"
    | "plan"
    | "characters"
    | "pages"
    | "storage"
    | "unexpected";
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

const markProjectFailed = async (projectId: number, userId: string) => {
  const updates: TablesUpdate<"Projects"> = {
    status: "failed",
  };

  await supabase
    .from("Projects")
    .update(updates)
    .eq("id", projectId)
    .eq("user_id", userId);
};

const uploadExternalImageToPagesBucket = async (
  sourceUrl: string,
  destinationPath: string,
) => {
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Could not fetch generated image (${response.status}).`);
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  const bytes = await response.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("pages")
    .upload(destinationPath, bytes, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage.from("pages").getPublicUrl(destinationPath);
  return data.publicUrl;
};

/**
 * Pipeline:
 * 1) Generate structured plan
 * 2) Generate character sheets
 * 3) Generate each manga page from panel descriptions + character refs
 * 4) Upload assets to Supabase Storage
 * 5) Persist final project in Supabase
 */
export async function processMangaGeneration(
  prompt: string,
  totalPages: number,
  options: ProcessMangaOptions = {},
): Promise<ProcessMangaResult> {
  const logs: ProcessLog[] = [];
  let projectId: number | null = null;
  let userId: string | null = null;

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

    const userResult = await supabase.auth.getUser();
    if (userResult.error || !userResult.data.user) {
      createProgressLog(
        logs,
        options.onProgress,
        "validation",
        "User not authenticated.",
      );
      return {
        ok: false,
        stage: "validation",
        error: "User not authenticated.",
        logs,
      };
    }

    userId = userResult.data.user.id;
    createProgressLog(
      logs,
      options.onProgress,
      "project",
      "Creating project...",
    );

    const initialProject: TablesInsert<"Projects"> = {
      user_id: userId,
      title: "Untitled",
      total_pages: totalPages,
      status: "queued",
      pages: [],
      plan: null,
      characters: [],
    };

    const { data: createdProject, error: createProjectError } = await supabase
      .from("Projects")
      .insert(initialProject)
      .select("id")
      .single();

    if (createProjectError || !createdProject) {
      const message =
        createProjectError?.message ?? "Failed to create project row.";
      createProgressLog(logs, options.onProgress, "project", message);
      return {
        ok: false,
        stage: "project",
        error: message,
        logs,
      };
    }

    projectId = createdProject.id;

    createProgressLog(
      logs,
      options.onProgress,
      "plan",
      "Generating manga plan...",
    );

    const planResult = await generatePlan(trimmedPrompt, totalPages);
    if (!planResult.ok) {
      if (projectId !== null) {
        await markProjectFailed(projectId, userId);
      }
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

    const processingUpdate: TablesUpdate<"Projects"> = {
      title: plan.title,
      plan,
      status: "processing",
    };

    await supabase
      .from("Projects")
      .update(processingUpdate)
      .eq("id", projectId)
      .eq("user_id", userId);

    createProgressLog(
      logs,
      options.onProgress,
      "plan",
      `Plan ready: \"${plan.title}\" with ${plan.characters.length} characters.`,
    );

    // Generate character images first so we can use them as references for page generation
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

        await markProjectFailed(projectId, userId);
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

    // Upload character images to storage and get public URLs
    createProgressLog(
      logs,
      options.onProgress,
      "storage",
      "Uploading character assets to storage...",
    );

    const characterAssets: CharacterGeneration[] = [];
    for (const character of characters) {
      const characterPath = `${userId}/${projectId}/character-${String(
        character.index + 1,
      ).padStart(3, "0")}.jpg`;

      const publicUrl = await uploadExternalImageToPagesBucket(
        character.imageUrl,
        characterPath,
      );

      characterAssets.push({
        ...character,
        imageUrl: publicUrl,
      });
    }

    // Now generate pages with character references
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
          characterAssets.find(
            (character) => character.index === characterIndex,
          ),
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

        await markProjectFailed(projectId, userId);
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

      createProgressLog(
        logs,
        options.onProgress,
        "storage",
        `Uploading page ${page.index + 1}/${sortedPages.length}`,
        { pageIndex: page.index },
      );

      const pagePath = `${userId}/${projectId}/page-${String(
        page.index + 1,
      ).padStart(3, "0")}.jpg`;

      const pagePublicUrl = await uploadExternalImageToPagesBucket(
        pageResult.imageUrl,
        pagePath,
      );

      pageImageUrls.push(pagePublicUrl);

      createProgressLog(
        logs,
        options.onProgress,
        "pages",
        `Page ${page.index + 1} ready.`,
        { pageImageUrl: pagePublicUrl, pageIndex: page.index },
      );
    }

    // Final update to project with all details and asset URLs
    const finalUpdate: TablesUpdate<"Projects"> = {
      title: plan.title,
      total_pages: totalPages,
      plan,
      pages: sortedPages.map((page, index) => ({
        index: page.index,
        characters: getCharacterIndexesForPage(page),
        panels: page.panels,
        imageUrl: pageImageUrls[index] ?? null,
      })),
      characters: characterAssets,
      status: "complete",
      cover_url: pageImageUrls[0] ?? null,
    };

    const { error: finalizeError } = await supabase
      .from("Projects")
      .update(finalUpdate)
      .eq("id", projectId)
      .eq("user_id", userId);

    if (finalizeError) {
      createProgressLog(
        logs,
        options.onProgress,
        "project",
        `Project update warning: ${finalizeError.message}`,
      );
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
        projectId,
        title: plan.title,
        plan,
        characters: characterAssets,
        pageImageUrls,
        logs,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    createProgressLog(logs, options.onProgress, "unexpected", message);

    if (projectId !== null && userId) {
      await markProjectFailed(projectId, userId);
    }

    return {
      ok: false,
      stage: "unexpected",
      error: message,
      logs,
    };
  }
}
