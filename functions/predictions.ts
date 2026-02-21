
const REPLICATE_API_KEY = process.env.EXPO_PUBLIC_REPLICATE_API_KEY;

// create a predictions on any model on replicate
export const createPrediction = async (model: string, body: any) => {
  try {
    const response = await fetch(
      `https://api.replicate.com/v1/models/${model}/predictions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${REPLICATE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Replicate API error: ${data.error || "Unknown error"}`);
    }

    return { ok: true, getUrl: data.urls.get };
  } catch (e) {
    console.log("Failed to create prediction", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : JSON.stringify(e),
    };
  }
};

// get the output from a predictions by polling the get url until the prediction is succeeded or failed
export const getPrediction = async (predictionUrl: string) => {
  try {
    while (true) {
      const response = await fetch(predictionUrl, {
        headers: {
          Authorization: `Bearer ${REPLICATE_API_KEY}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          `Replicate API error: ${data.error || "Unknown error"}`,
        );
      }

      if (data.status === "succeeded") {
        return { ok: true, output: data.output };
      } else if (data.status === "failed") {
        throw new Error(
          data.error || "Prediction failed without error message",
        );
      }

      // wait for 2 seconds before polling again
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  } catch (e) {
    console.log("Failed to get prediction output", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : JSON.stringify(e),
    };
  }
};
