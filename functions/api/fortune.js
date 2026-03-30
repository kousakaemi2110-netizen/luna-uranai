const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const { prompt } = await request.json();
    if (!prompt) {
      return new Response(JSON.stringify({ error: 'promptが必要です' }), { status: 400, headers: CORS });
    }
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY未設定' }), { status: 500, headers: CORS });
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 1024, temperature: 0.8 },
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('Gemini error:', res.status, errText);
      return new Response(JSON.stringify({ error: `Gemini APIエラー: ${res.status}` }), { status: 502, headers: CORS });
    }
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '鑑定結果を取得できませんでした。';
    return new Response(JSON.stringify({ text }), { status: 200, headers: CORS });
  } catch (e) {
    console.error('fortune error:', e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
  }
}

