export interface GatewayMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GatewayOptions {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
}

export const DEFAULT_BRAINTRUST_GATEWAY_BASE_URL = "https://gateway.braintrust.dev";
export const DEFAULT_MODEL = "gpt-5-mini";

export function gatewayConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): Required<GatewayOptions> {
  return {
    apiKey: env.BRAINTRUST_API_KEY ?? "",
    baseUrl: env.BRAINTRUST_GATEWAY_BASE_URL ?? DEFAULT_BRAINTRUST_GATEWAY_BASE_URL,
    model: env.BRAINTRUST_MODEL ?? DEFAULT_MODEL,
    temperature: 0,
  };
}

export async function completeWithBraintrustGateway(
  messages: GatewayMessage[],
  options: GatewayOptions = {},
): Promise<string> {
  const envConfig = gatewayConfigFromEnv();
  const apiKey = options.apiKey ?? envConfig.apiKey;
  const baseUrl = options.baseUrl ?? envConfig.baseUrl;
  const model = options.model ?? envConfig.model;
  const temperature = options.temperature ?? envConfig.temperature;

  if (apiKey.trim().length === 0) {
    throw new Error(
      "Missing BRAINTRUST_API_KEY. Set it in examples/support-ticket-triage-agent/.env or export it in your shell.",
    );
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages, temperature }),
  });

  const responseText = await response.text();
  let body: ChatCompletionResponse = {};
  try {
    body = JSON.parse(responseText) as ChatCompletionResponse;
  } catch {
    // Some Gateway errors are returned as plain text.
  }

  if (!response.ok) {
    const detail = body.error?.message ?? (responseText.trim() || response.statusText);
    throw new Error(`Braintrust Gateway request failed (${response.status}): ${detail}`);
  }

  const content = body.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error("Braintrust Gateway response did not include a message content string.");
  }

  return content;
}
