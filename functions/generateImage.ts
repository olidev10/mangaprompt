import { supabase } from "@/lib/supabase";

const REPLICATE_API_KEY = process.env.EXPO_PUBLIC_REPLICATE_API_KEY;

type GenerateResult = {
  imageUrl: string | null;
  error: string | null;
};

const decrementCredits = async (userId: string, remainingCredits: number) => {
  const { error } = await supabase
    .from("profiles")
    .update({ credits: remainingCredits - 1 })
    .eq("id", userId);

  if (error) {
    return { error: `Failed to update credits: ${error.message}` };
  }

  return { error: null };
};

const runReplicatePrediction = async (
  input: Record<string, any>,
  model: string = "google/nano-banana",
): Promise<GenerateResult> => {
  // getUserId from supabase auth
  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !data.user) {
    return {
      imageUrl: null,
      error: "User not authenticated" + JSON.stringify(userError),
    };
  }
  const userId = data.user.id;

  // Fetch user credits
  const { data: profile } = await supabase
    .from("profiles")
    .select("credits")
    .eq("id", userId)
    .single();
  const remainingCredits = profile?.credits ?? 0;
  if (remainingCredits <= 0) {
    return {
      imageUrl: null,
      error: `Not enough credits. current credits: ${remainingCredits}`,
    };
  }

  // Start Replicate prediction
  const response = await fetch(
    `https://api.replicate.com/v1/models/${model}/predictions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REPLICATE_API_KEY}`,
        "Content-Type": "application/json",
        Prefer: "wait",
      },
      body: JSON.stringify({ input }),
    },
  );

  const result = await response.json();
  if (!response.ok) {
    return { imageUrl: null, error: result.error };
  }

  // if prediction is already done
  if (result.status === "succeeded") {
    const { error } = await decrementCredits(userId, remainingCredits);
    if (error) {
      return { imageUrl: null, error };
    }
    return {
      imageUrl: result.output as string,
      error: null,
    };
  }

  // polling
  let poll = result.urls.get;
  let polling;
  let pollJSON;

  while (polling !== "succeeded" && polling !== "failed") {
    await new Promise((r) => setTimeout(r, 2000));

    const pollRes = await fetch(poll, {
      headers: { Authorization: `Bearer ${REPLICATE_API_KEY}` },
    });

    pollJSON = await pollRes.json();
    polling = pollJSON.status;
  }

  // result.status can be "succeeded" or "failed"
  if (polling === "succeeded") {
    const { error } = await decrementCredits(userId, remainingCredits);
    if (error) {
      return { imageUrl: null, error };
    }
    return {
      imageUrl: result.output as string,
      error: null,
    };
  } else {
    return { imageUrl: null, error: pollJSON.error };
  }
};

// generate manga page based on prompt and reference images (optional)
export const generatePage = async (
  prompt: string,
  referenceImages: string[] = [],
): Promise<GenerateResult> => {
  const input = {
    prompt: `The provided images are references (characters or style). Generate the manga page described below while respecting these references and the manga style:\n${prompt}`,
    output_format: "jpg",
    aspect_ratio: "3:4",
    resolution: "1K",
    safety_filter_level: "block_only_high",
    ...(referenceImages.length > 0 ? { image_input: referenceImages } : {}),
  };

  return await runReplicatePrediction(input);
};

export const generateCharacter = async (
  name: string,
  description: string,
): Promise<GenerateResult> => {
  const input = {
    prompt: `character sheet, ${description}, manga style, full body, white background, colored illustration, write only the name of the character: ${name}`,
    output_format: "jpg",
    aspect_ratio: "3:4",
    resolution: "1K",
    safety_filter_level: "block_only_high",
  };

  return await runReplicatePrediction(input);
};
