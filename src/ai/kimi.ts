import { config } from "../config";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const UI_SYSTEM_PROMPT = `You are a senior UI/UX designer specializing in analytics dashboards.
Your task is to generate CSS and HTML improvements for a YouTube Analytics dashboard.

Rules:
- The dashboard uses a dark theme (background: #0f0f23, cards: rgba(255,255,255,0.05))
- Primary color: #6366f1 (indigo), secondary: #8b5cf6 (violet)
- Font: 'Noto Sans Georgian' for Georgian text
- Use glassmorphism (backdrop-filter: blur), rounded corners (16px), subtle borders
- Charts use Chart.js v4
- Keep responses as valid JSON with { css?: string, html?: string, suggestions?: string[] }
- Focus on visual polish, micro-interactions, and data visualization clarity
- All text must be in Georgian (ქართული)`;

interface OpenRouterResponse {
  choices?: Array<{
    message?: { content?: string };
  }>;
  error?: { message?: string };
}

export interface UIRecommendation {
  css?: string;
  html?: string;
  suggestions?: string[];
  raw?: string;
}

export async function askKimiForUI(prompt: string): Promise<UIRecommendation> {
  if (!config.ai.openrouterApiKey) {
    return { suggestions: ["⚠️ OpenRouter API არ არის კონფიგურირებული."] };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.ai.openrouterApiKey}`,
        "HTTP-Referer": "https://aipulsegeorgia.com",
        "X-Title": "AI Pulse Georgia Dashboard",
      },
      body: JSON.stringify({
        model: config.ai.kimiModel,
        messages: [
          { role: "system", content: UI_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        temperature: 0.6,
        max_tokens: 2048,
      }),
      signal: controller.signal,
    });

    const data = (await response.json()) as OpenRouterResponse;

    if (data.error) {
      console.error("[Kimi] API error:", data.error.message);
      return { suggestions: [`შეცდომა: ${data.error.message}`] };
    }

    const content = data.choices?.[0]?.message?.content || "";

    // Try to parse JSON response
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as UIRecommendation;
      }
    } catch {
      // Not JSON, return as raw text
    }

    return { raw: content, suggestions: [content] };
  } catch (err) {
    console.error("[Kimi] Request failed:", err);
    return { suggestions: ["❌ Kimi-სთან კავშირი ვერ მოხერხდა."] };
  } finally {
    clearTimeout(timer);
  }
}
