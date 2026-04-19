interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionOptions {
  model: string;
  messages: ChatMessage[];
  max_tokens: number;
  temperature: number;
  reasoning?: {
    max_tokens: number;
  };
}

interface ChatCompletionResponse {
  choices: { message: { content: string } }[];
}

export async function chatCompletion(
  options: ChatCompletionOptions
): Promise<string> {
  const body: Record<string, unknown> = {
    model: options.model,
    messages: options.messages,
    max_tokens: options.max_tokens,
    temperature: options.temperature,
  };

  if (options.reasoning) {
    body.reasoning = options.reasoning;
    // Thinking mode requires temperature = 1 for Anthropic models
    if (options.model.startsWith("anthropic/")) {
      body.temperature = 1;
    }
  }

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`OpenRouter API error ${res.status}: ${errorText}`);
  }

  const data: ChatCompletionResponse = await res.json();
  return data.choices[0].message.content;
}
