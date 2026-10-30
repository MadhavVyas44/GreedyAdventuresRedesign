import type { LanguageModelV4 } from "@ai-sdk/provider";

// Tries each model in order and moves to the next one if a call fails
// (quota used up, model overloaded, model removed). Only a failure to start
// a reply is caught; once a reply is streaming it stays on that model.
export function withFallbacks(models: LanguageModelV4[]): LanguageModelV4 {
  async function tryInOrder<T>(
    call: (model: LanguageModelV4) => PromiseLike<T>,
    abortSignal: AbortSignal | undefined,
  ): Promise<T> {
    let lastError: unknown;
    for (const [index, model] of models.entries()) {
      try {
        return await call(model);
      } catch (error) {
        // The customer cancelled: don't try the next model.
        if (abortSignal?.aborted) throw error;
        lastError = error;
        const next = models[index + 1];
        console.warn(
          `model ${model.modelId} failed${next ? `, trying ${next.modelId}` : ""}:`,
          error instanceof Error ? error.message : error,
        );
      }
    }
    throw lastError;
  }

  return {
    specificationVersion: "v4",
    provider: models[0].provider,
    modelId: models.map((model) => model.modelId).join(" → "),
    supportedUrls: models[0].supportedUrls,
    doGenerate: (options) =>
      tryInOrder(async (model) => {
        const result = await model.doGenerate(options);
        // Record which model replied (otherwise the combined name above is reported).
        return { ...result, response: { ...result.response, modelId: model.modelId } };
      }, options.abortSignal),
    doStream: (options) =>
      tryInOrder((model) => model.doStream(options), options.abortSignal),
  };
}
