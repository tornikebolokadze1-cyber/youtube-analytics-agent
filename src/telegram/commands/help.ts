import type { Context } from "grammy";

export async function helpCommand(ctx: Context): Promise<void> {
  const text = `📚 <b>ბრძანებების სია</b>
━━━━━━━━━━━━━━━━━

📊 /overview [7d|28d|90d|365d] — არხის მიმოხილვა
🔝 /videos [რაოდენობა] — ტოპ ვიდეოები
👥 /audience — დემოგრაფია და გეოგრაფია
🔍 /traffic — ტრაფიკის წყაროები
🔎 /search — საძიებო ტერმინები
📈 /trends — ზრდის ტრენდები
⏱ /realtime — ბოლო 48 საათის სტატისტიკა
📋 /report [weekly|monthly] — სრული ანგარიში
📉 /retention [videoId] — ვიდეოს retention
❓ /help — ეს შეტყობინება

💡 <b>ასევე შეგიძლიათ დასვათ კითხვები:</b>
• "რამდენი ნახვა მქონდა ბოლო თვეში?"
• "საიდან მოდის ტრაფიკი?"
• "ტოპ ვიდეოები მაჩვენე"
• "How is my channel growing?"`;

  await ctx.reply(text, { parse_mode: "HTML" });
}
