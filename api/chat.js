// api/chat.js
// Clean Vercel Serverless Proxy for Gemini RAG Copilot

function cleanEnv(val) {
  return String(val || '')
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .trim();
}

function extractJsonPayload(rawText) {
  const cleaned = String(rawText || '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return { reply: cleaned, actions: [] };
      }
    }
    return { reply: cleaned, actions: [] };
  }
}

async function discoverFlashModels(apiKey) {
  try {
    const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`
);
    if (!res.ok) return [];
    const data = await res.json();
    const models = Array.isArray(data?.models) ? data.models : [];

    return models
      .filter((m) => {
        const methods = m.supportedGenerationMethods || [];
        const name = String(m.name || '').toLowerCase();
        return (
          methods.includes('generateContent') &&
          name.includes('gemini') &&
          !name.includes('embedding') &&
          !name.includes('image') &&
          !name.includes('audio') &&
          !name.includes('tts') &&
          !name.includes('vision')
        );
      })
      .map((m) => String(m.name).replace(/^models\//, ''))
      .sort((a, b) => {
        const aFlash = a.includes('flash') ? 0 : 1;
        const bFlash = b.includes('flash') ? 0 : 1;
        return aFlash - bFlash;
      });
  } catch {
    return [];
  }
}

async function tryGenerate(model, apiKey, prompt) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const upstream = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => '');
    return { ok: false, status: upstream.status, error: errText.slice(0, 240) };
  }

  const data = await upstream.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    return { ok: false, status: 502, error: 'Empty candidate text from Gemini' };
  }

  const parsed = extractJsonPayload(rawText);
  if (parsed && typeof parsed.reply === 'string') {
    return {
      ok: true,
      payload: {
        reply: parsed.reply,
        actions: Array.isArray(parsed.actions) ? parsed.actions : [],
        mode: `gemini-rag-server (${model})`,
      },
    };
  }

  return { ok: false, status: 502, error: 'Invalid JSON payload from Gemini' };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = cleanEnv(process.env.GEMINI_API_KEY);
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY missing in env' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const prompt = String(body.prompt || '').trim();
    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    const preferredModel = cleanEnv(process.env.GEMINI_MODEL) || 'gemini-2.5-flash';
    const candidates = Array.from(
      new Set([preferredModel, 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-flash-latest'])
    );

    const failures = [];
    for (const model of candidates) {
      const attempt = await tryGenerate(model, apiKey, prompt);
      if (attempt.ok) {
        return res.status(200).json(attempt.payload);
      }
      failures.push(`${model}:${attempt.status}`);
      if (attempt.status === 401 || attempt.status === 403) {
        return res.status(attempt.status).json({ error: `API key rejected (${attempt.status})` });
      }
    }

    const discovered = await discoverFlashModels(apiKey);
    for (const model of discovered.slice(0, 3)) {
      if (candidates.includes(model)) continue;
      const attempt = await tryGenerate(model, apiKey, prompt);
      if (attempt.ok) {
        return res.status(200).json(attempt.payload);
      }
      failures.push(`${model}:${attempt.status}`);
    }

    return res.status(502).json({
      error: 'No working Gemini model succeeded',
      failures,
    });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Serverless proxy error' });
  }
}
