// /lib/telegram.js
// EXECUTIA — Telegram alert helper
// Usage: import { sendTelegram } from '../lib/telegram.js';
//
// Vercel env required:
//   TELEGRAM_BOT_TOKEN=your_bot_token
//   TELEGRAM_CHAT_ID=your_chat_id (your personal chat ID or group)

export async function sendTelegram(text) {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn('TELEGRAM: env not set (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID)');
    return { ok: false, reason: 'no_config' };
  }

  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id:    chatId,
        text,
        parse_mode: 'Markdown'
      })
    });
    const data = await r.json();
    if (!r.ok) console.warn('TELEGRAM: API error', JSON.stringify(data));
    return { ok: r.ok, data };
  } catch (e) {
    console.error('TELEGRAM: fetch error', e.message);
    return { ok: false, reason: e.message };
  }
}
