// Simple Gemini client wrapper used by conversation UI
// WARNING: This file contains a client-side API key. For production, move calls to a trusted server.
const GEM_API_KEY = "AIzaSyArGnZbyf9Ot3N4mo85VT8K0shIrGDyJB8";
const GEM_API_URL = GEM_API_KEY
  ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEM_API_KEY}`
  : "/api/generate";

const GEM_SYSTEM_PROMPT = `
You are MyMcKenzie AI — an intelligent UK-based legal assistant.
You help litigants in person by offering plain-English legal process guidance.
Never refer to yourself as "Google Gemini." Always use "MyMcKenzie AI."`;

export async function generateGeminiReply(chatHistory = []) {
  const maxRetries = 2;
  const body = {
    contents: [
      { role: "user", parts: [{ text: GEM_SYSTEM_PROMPT }] },
      ...chatHistory
    ]
  };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(GEM_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      // network-level failures will throw and be caught below
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || `Gemini request failed (status ${res.status})`);
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return reply || '';
    } catch (err) {
      // If this was the last attempt, return a descriptive error string for the UI to handle
      console.warn(`generateGeminiReply attempt ${attempt + 1} failed:`, err && err.message ? err.message : err);
      if (attempt === maxRetries) {
        // Normalize known fetch error messages to be easier to detect
        const msg = (err && err.message) ? err.message : String(err);
        if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
          return 'FAILED_NETWORK';
        }
        return `ERROR:${msg}`;
      }
      // backoff delay before retrying
      await new Promise(res => setTimeout(res, 300 * Math.pow(2, attempt)));
    }
  }
}
// Simple Gemini client wrapper used by conversation UI
// WARNING: This file contains a client-side API key. For production, move calls to a trusted server.
const API_KEY = "AIzaSyArGnZbyf9Ot3N4mo85VT8K0shIrGDyJB8";
const API_URL = API_KEY
  ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${API_KEY}`
  : "/api/generate";

const systemPrompt = `
You are MyMcKenzie AI — an intelligent UK-based legal assistant.
You help litigants in person by offering plain-English legal process guidance.
Never refer to yourself as "Google Gemini." Always use "MyMcKenzie AI."`;

export async function generateGeminiReply(chatHistory = []) {
  try {
    const body = {
      contents: [
        { role: "user", parts: [{ text: systemPrompt }] },
        ...chatHistory
      ]
    };

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Gemini request failed');
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return reply || '';
  } catch (err) {
    console.error('generateGeminiReply error:', err);
    return `⚠️ Bot error: ${err.message || err}`;
  }
}
