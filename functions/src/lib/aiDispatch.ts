import { getAiProviderSetting, type AiFeatureKey } from "./aiProviderSettings";
import { generateContent as vertexGenerateContent, type ContentPart } from "./vertexAi";
import { generateContent as openRouterGenerateContent } from "./openRouter";
import { OPENROUTER_SECRET_BY_FEATURE } from "./openRouterSecrets";

export type { ContentPart };

// One-shot generation (no chat history, no caching) routed per the feature's own
// AiProviderSetting — the single call point deals-findReviewers.ts's two AI calls go through,
// so the vertex/openrouter branch (and each feature's own OpenRouter key) only has to be
// written once.
export async function dispatchGenerateContent(
  featureKey: AiFeatureKey,
  input: { systemPrompt?: string; parts: ContentPart[]; responseMimeType?: string }
): Promise<string> {
  const setting = await getAiProviderSetting(featureKey);
  if (setting.provider === "openrouter" && setting.openrouterModel) {
    const apiKey = OPENROUTER_SECRET_BY_FEATURE[featureKey].value();
    return openRouterGenerateContent({
      apiKey,
      model: setting.openrouterModel,
      providerSlug: setting.openrouterProviderSlug,
      ...input,
    });
  }
  return vertexGenerateContent(input);
}
