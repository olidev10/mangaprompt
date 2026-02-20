const REPLICATE_API_KEY = process.env.EXPO_PUBLIC_REPLICATE_API_KEY;

export async function generatePlan(
  prompt: string,
  totalPages: number,
): Promise<{ ok: true; data: MangaOutput } | { ok: false; error: string }> {
  try {
    const response = await fetch(
      "https://api.replicate.com/v1/models/openai/gpt-5/predictions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${REPLICATE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stream: false,
          input: {
            prompt: `build a total of ${totalPages} pages based on this story: \n${prompt}`,
            system_prompt: system_page,
            verbosity: "medium",
            image_input: [],
            reasoning_effort: "minimal",
          },
        }),
      },
    );

    const data = await response.json();
    if (!response.ok) {
      console.log("Error from Replicate API", data.error);
      throw new Error(`Replicate API error: ${data.error || "Unknown error"}`);
    }

    console.log("metrics from Replicate API", data.metrics);
    const outputString = data.output.join("").replace(/\n/g, "");
    console.log("Raw output from AI:", outputString);
    const parsed = JSON.parse(outputString) as MangaOutput;
    return { ok: true, data: parsed };
  } catch (e) {
    console.log("Failed to parse JSON from AI", e);
    return {
      ok: false,
      error:
        "Failed to generate manga plan: " +
        (e instanceof Error ? e.message : String(e)),
    };
  }
}

export const system_page = `
    You are an assistant specialized in creating manga pages in a manga/comic style.
    Your role is to transform a user prompt into a complete manga page, structured according to a strict and coherent format.
    🎯 Objective:
    Always produce a detailed manga page sheet in this JSON format:
    {
        "title": string,
        "characters": [
            {
                "index": Number, // starting from 0)
                "name": string,
                "description": string, // Physical and outfits details (hairstyle, skin, distinctive features, accessories), never mention age but can mention if the character looks young, adult, or old.
            }
        ],
        "pages": [ // 2 to 10 pages based on the user prompt, never more.
            {
                "index": Number, // starting from 0
                "characters": [Number], // list of character indexes that appear on the page
                // Each panel represents a distinct scene or moment in the story, with its own description and visual elements.
                "panels": [ // 4 panels per page, but can be less if the story requires it, never more.
                    {
                        "index": Number, // starting from 0
                        "description": string, // Detailed description of the scene, characters' actions/dialogues, emotions, and interactions. Include background details and any relevant objects or settings.
                    }
                ]
            }
        ]
    }

    Rendering format JSON, No comments.
`;

export type MangaOutput = {
  title: string;
  characters: {
    index: number;
    name: string;
    description: string;
  }[];
  pages: {
    index: number;
    panels: {
      index: number;
      characters: number[];
      description: string;
    }[];
  }[];
};
