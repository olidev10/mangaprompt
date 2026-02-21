import { createPrediction, getPrediction } from "./predictions";

export async function generatePlan(
  prompt: string,
  totalPages: number,
): Promise<{ ok: true; data: MangaOutput } | { ok: false; error: string }> {
  try {
    //  create a predictions
    const body = {
      stream: false,
      input: {
        prompt: `build a total of ${totalPages} pages based on this story: \n${prompt}`,
        system_prompt: system_page,
        verbosity: "medium",
        image_input: [],
        reasoning_effort: "minimal",
      },
    };
    const createResp = await createPrediction("openai/gpt-5", body);
    if (!createResp.ok) {
      throw new Error(createResp.error);
    }

    // get the output from the predictions
    const getResp = await getPrediction(createResp.getUrl);
    if (!getResp.ok) {
      throw new Error(getResp.error);
    }

    const output = getResp.output; // this a a list of string, we need to join them and parse the JSON

    const outputString = output.join("").replace(/\n/g, "");
    // console.log("Raw output from AI:", outputString);
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
