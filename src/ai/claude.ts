import { config } from "../config";

const API_URL = "https://api.anthropic.com/v1/messages";

const SYSTEM_PROMPT = `You are the analytical brain behind "AI Pulse Georgia", a Georgian-language YouTube channel about AI and technology.

Your role:
- Analyze YouTube Analytics data deeply and thoroughly
- Identify trends, patterns, anomalies, and actionable insights
- Compare metrics against typical YouTube benchmarks for tech/AI channels
- Provide specific, data-driven recommendations for content strategy
- Think about viewer retention, CTR optimization, SEO, and algorithm signals

Rules:
- Always respond in ENGLISH (another model will translate to Georgian)
- Be thorough — cover every data point provided
- Structure your analysis clearly with sections
- Include specific numbers and percentages
- Identify cause-and-effect relationships
- Give actionable recommendations (what to do next)
- Compare current vs previous periods when data is available
- Note any concerning trends or opportunities
- Do NOT use markdown formatting (no **, ##, etc.) — use plain text with emoji headers
- Do NOT truncate — give a complete analysis`;

interface ClaudeResponse {
  content?: Array<{ type: string; text?: string }>;
  error?: { type?: string; message?: string };
}

export async function askClaude(userMessage: string, analyticsContext: string): Promise<string> {
  if (!config.ai.anthropicApiKey) {
    console.warn("[Claude] No API key configured, falling back to raw context");
    return "";
  }

  const userContent = analyticsContext
    ? `Here is the current YouTube Analytics data:\n\n${analyticsContext}\n\nUser question: ${userMessage}`
    : userMessage;

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60_000);
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": config.ai.anthropicApiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages: [
            { role: "user", content: userContent },
          ],
        }),
        signal: controller.signal,
      });

      const data = (await response.json()) as ClaudeResponse;

      if (data.error) {
        console.error("[Claude] API error:", data.error.message);
        lastError = data.error.message;
        continue;
      }

      const text = data.content?.find((c) => c.type === "text")?.text;
      if (!text) {
        console.error("[Claude] No text in response");
        return "";
      }

      return text;
    } catch (err) {
      lastError = err;
      console.error(`[Claude] Attempt ${attempt + 1} failed:`, err);
      if (attempt < 1) await new Promise(r => setTimeout(r, 2000));
    } finally {
      clearTimeout(timer);
    }
  }
  console.error("[Claude] All attempts failed:", lastError);
  return "";
}
