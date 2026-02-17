import { config } from "../config";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

const SYSTEM_PROMPT = `შენ ხარ "AI Pulse Georgia" YouTube არხის ქართულენოვანი მწერალი.
შენი სახელია "AI Pulse ანალიტიკოსი". არხის სახელია "AI Pulse Georgia" — ქართული AI/ტექნოლოგიების არხი.

შენი როლი:
- შენ არ აანალიზებ მონაცემებს — Claude (ხელოვნური ინტელექტი) უკვე გააკეთა ანალიზი
- შენი საქმეა Claude-ის ინგლისურენოვანი ანალიზი გადაწერო ქართულად, პროფესიონალურად და ლამაზად
- თუ მონაცემები პირდაპირ მოგეწოდა (Claude-ის ანალიზის გარეშე), მაშინ შენ თავად გააანალიზე

წესები:
- ყოველთვის უპასუხე ქართულად, დეტალურად და პროფესიონალურად
- გამოიყენე ემოჯი სათაურებში (📊, 📈, 👁, ⏱, 👥, 🔝, 🔍, 🌍, 📱, 🎯, 💡, 🔥)
- შეინარჩუნე ყველა ციფრი, პროცენტი და კონკრეტული მონაცემი
- შეინარჩუნე ყველა ინსაითი და რეკომენდაცია
- არ დაამატო ახალი ანალიზი ან მონაცემები რაც წყაროში არ არის
- პასუხი იყოს ვრცელი და სრულყოფილი — არაფერი გამოტოვო
- არ გამოიყენო markdown ფორმატირება (**, ## და ა.შ.) — მხოლოდ ტექსტი და ემოჯი
- არ მოჭრა პასუხი — დაასრულე ლოგიკურად`;

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message?: string };
}

export async function askGemini(userMessage: string, analyticsContext?: string): Promise<string> {
  if (!config.ai.geminiApiKey) {
    return "⚠️ Gemini API არ არის კონფიგურირებული.";
  }

  const parts: Array<{ text: string }> = [];

  if (analyticsContext) {
    parts.push({ text: `კონტექსტი (არხის მონაცემები):\n${analyticsContext}` });
  }
  parts.push({ text: userMessage });

  const url = `${BASE_URL}/${config.ai.geminiModel}:generateContent?key=${config.ai.geminiApiKey}`;

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60_000);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 4096, topP: 0.9 },
        }),
        signal: controller.signal,
      });

      const data = (await response.json()) as GeminiResponse;

      if (data.error) {
        console.error("[Gemini] API error:", data.error.message);
        lastError = data.error.message;
        if (attempt < 1) { await new Promise(r => setTimeout(r, 2000)); continue; }
        return "⚠️ Gemini-ს შეცდომა მოხდა. სცადეთ თავიდან.";
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        return "🤔 ვერ მოხერხდა პასუხის გენერაცია. სცადეთ თავიდან.";
      }

      return text;
    } catch (err) {
      lastError = err;
      console.error(`[Gemini] Attempt ${attempt + 1} failed:`, err);
      if (attempt < 1) await new Promise(r => setTimeout(r, 2000));
    } finally {
      clearTimeout(timer);
    }
  }
  console.error("[Gemini] All attempts failed:", lastError);
  return "❌ Gemini-სთან კავშირი ვერ მოხერხდა.";
}
