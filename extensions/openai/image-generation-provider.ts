import type { OpenClawConfig } from "openclaw/plugin-sdk/config-runtime";
import type { ImageGenerationProvider } from "openclaw/plugin-sdk/image-generation";
import { isProviderApiKeyConfigured } from "openclaw/plugin-sdk/provider-auth";
import { resolveApiKeyForProvider } from "openclaw/plugin-sdk/provider-auth-runtime";
import {
  assertOkOrThrowHttpError,
  postJsonRequest,
  resolveProviderHttpRequestConfig,
} from "openclaw/plugin-sdk/provider-http";
import { OPENAI_DEFAULT_IMAGE_MODEL as DEFAULT_OPENAI_IMAGE_MODEL } from "./default-models.js";
import { resolveConfiguredOpenAIBaseUrl, toOpenAIDataUrl } from "./shared.js";

const DEFAULT_OPENAI_IMAGE_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_OUTPUT_MIME = "image/png";
const DEFAULT_SIZE = "1024x1024";
const OPENAI_SUPPORTED_SIZES = ["1024x1024", "1024x1536", "1536x1024"] as const;
const OPENAI_MAX_INPUT_IMAGES = 5;
const MOCK_OPENAI_PROVIDER_ID = "mock-openai";

function shouldAllowPrivateImageEndpoint(req: {
  provider: string;
  cfg: OpenClawConfig | undefined;
}) {
  if (req.provider === MOCK_OPENAI_PROVIDER_ID) {
    return true;
  }
  const baseUrl = resolveConfiguredOpenAIBaseUrl(req.cfg);
  if (!baseUrl.startsWith("http://127.0.0.1:") && !baseUrl.startsWith("http://localhost:")) {
    return false;
  }
  return process.env.OPENCLAW_QA_ALLOW_LOCAL_IMAGE_PROVIDER === "1";
}

type OpenAIImageApiResponse = {
  data?: Array<{
    b64_json?: string;
    url?: string;
    revised_prompt?: string;
  }>;
};

async function resolveGeneratedImageAsset(params: {
  entry: NonNullable<OpenAIImageApiResponse["data"]>[number];
  index: number;
}) {
  if (params.entry.b64_json) {
    return {
      buffer: Buffer.from(params.entry.b64_json, "base64"),
      mimeType: DEFAULT_OUTPUT_MIME,
      fileName: `image-${params.index + 1}.png`,
      ...(params.entry.revised_prompt ? { revisedPrompt: params.entry.revised_prompt } : {}),
    };
  }

  if (!params.entry.url) {
    return null;
  }

  const response = await fetch(params.entry.url);
  if (!response.ok) {
    throw new Error(`OpenAI image URL download failed with status ${response.status}`);
  }
  const mimeType = response.headers.get("content-type")?.trim() || DEFAULT_OUTPUT_MIME;
  const extension = mimeType.includes("jpeg") ? "jpg" : mimeType.includes("webp") ? "webp" : "png";
  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    mimeType,
    fileName: `image-${params.index + 1}.${extension}`,
    ...(params.entry.revised_prompt ? { revisedPrompt: params.entry.revised_prompt } : {}),
  };
}

export function buildOpenAIImageGenerationProvider(): ImageGenerationProvider {
  return {
    id: "openai",
    label: "OpenAI",
    defaultModel: DEFAULT_OPENAI_IMAGE_MODEL,
    models: [DEFAULT_OPENAI_IMAGE_MODEL],
    isConfigured: ({ agentDir }) =>
      isProviderApiKeyConfigured({
        provider: "openai",
        agentDir,
      }),
    capabilities: {
      generate: {
        maxCount: 4,
        supportsSize: true,
        supportsAspectRatio: false,
        supportsResolution: false,
      },
      edit: {
        enabled: true,
        maxCount: 4,
        maxInputImages: OPENAI_MAX_INPUT_IMAGES,
        supportsSize: true,
        supportsAspectRatio: false,
        supportsResolution: false,
      },
      geometry: {
        sizes: [...OPENAI_SUPPORTED_SIZES],
      },
    },
    async generateImage(req) {
      const inputImages = req.inputImages ?? [];
      const isEdit = inputImages.length > 0;
      const auth = await resolveApiKeyForProvider({
        provider: "openai",
        cfg: req.cfg,
        agentDir: req.agentDir,
        store: req.authStore,
      });
      if (!auth.apiKey) {
        throw new Error("OpenAI API key missing");
      }
      const { baseUrl, allowPrivateNetwork, headers, dispatcherPolicy } =
        resolveProviderHttpRequestConfig({
          baseUrl: resolveConfiguredOpenAIBaseUrl(req.cfg),
          defaultBaseUrl: DEFAULT_OPENAI_IMAGE_BASE_URL,
          allowPrivateNetwork: shouldAllowPrivateImageEndpoint(req),
          defaultHeaders: {
            Authorization: `Bearer ${auth.apiKey}`,
          },
          provider: "openai",
          capability: "image",
          transport: "http",
        });

      const model = req.model || DEFAULT_OPENAI_IMAGE_MODEL;
      const count = req.count ?? 1;
      const size = req.size ?? DEFAULT_SIZE;
      const requestResult = isEdit
        ? await (() => {
            const jsonHeaders = new Headers(headers);
            jsonHeaders.set("Content-Type", "application/json");
            return postJsonRequest({
              url: `${baseUrl}/images/edits`,
              headers: jsonHeaders,
              body: {
                model,
                prompt: req.prompt,
                n: count,
                size,
                images: inputImages.map((image) => ({
                  image_url: toOpenAIDataUrl(
                    image.buffer,
                    image.mimeType?.trim() || DEFAULT_OUTPUT_MIME,
                  ),
                })),
              },
              timeoutMs: req.timeoutMs,
              fetchFn: fetch,
              allowPrivateNetwork,
              dispatcherPolicy,
            });
          })()
        : await (() => {
            const jsonHeaders = new Headers(headers);
            jsonHeaders.set("Content-Type", "application/json");
            return postJsonRequest({
              url: `${baseUrl}/images/generations`,
              headers: jsonHeaders,
              body: {
                model,
                prompt: req.prompt,
                n: count,
                size,
              },
              timeoutMs: req.timeoutMs,
              fetchFn: fetch,
              allowPrivateNetwork,
              dispatcherPolicy,
            });
          })();
      const { response, release } = requestResult;
      try {
        await assertOkOrThrowHttpError(
          response,
          isEdit ? "OpenAI image edit failed" : "OpenAI image generation failed",
        );

        const data = (await response.json()) as OpenAIImageApiResponse;
        const images = (
          await Promise.all(
            (data.data ?? []).map((entry, index) =>
              resolveGeneratedImageAsset({
                entry,
                index,
              }),
            ),
          )
        ).filter((entry): entry is NonNullable<typeof entry> => entry !== null);

        return {
          images,
          model,
        };
      } finally {
        await release();
      }
    },
  };
}
