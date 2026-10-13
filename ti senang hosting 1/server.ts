import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { TEMAN_BERPIKIR_SYSTEM_PROMPT } from './src/services/ai/temanBerpikirPrompt.ts';
import { generateOfflineTemanBerpikirResponse } from './src/services/ai/offlineFallback.ts';
import { getOfflineGameContent } from './src/services/ai/gameContentGenerator.ts';

const app = express();
const PORT = 3000;

app.use(express.json());

// Set Permissions-Policy header to allow Web Bluetooth where supported
app.use((_req, res, next) => {
  res.setHeader('Permissions-Policy', 'bluetooth=*');
  next();
});

// Lazy-initialized Gemini client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== 'MY_GEMINI_API_KEY') {
      geminiClient = new GoogleGenAI({ apiKey: key });
    }
  }
  return geminiClient;
}

// Track temporary model cooldowns (e.g. 503 high-demand or 429) to avoid latency spikes
const modelCooldowns = new Map<string, number>();

function isModelAvailable(modelName: string): boolean {
  const cooldownUntil = modelCooldowns.get(modelName);
  if (cooldownUntil && Date.now() < cooldownUntil) {
    return false;
  }
  return true;
}

function markModelCooldown(modelName: string, durationMs = 60000) {
  modelCooldowns.set(modelName, Date.now() + durationMs);
}

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
  });
});

// 2. Chat endpoint for Teman Berpikir AI
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, history = [], currentContext = 'Pembelajaran Sains dan Matematika' } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const ai = getGeminiClient();

    if (ai) {
      try {
        // Prepare multi-turn history ensuring strictly alternating user/model turns
        const rawTurns: Array<{ role: 'user' | 'model'; text: string }> = [];

        // Context reminder if applicable
        if (currentContext) {
          rawTurns.push({
            role: 'user',
            text: `[Konteks Pembelajaran: ${currentContext}]`,
          });
          rawTurns.push({
            role: 'model',
            text: `Baik, saya memahami konteks pembelajaran ${currentContext}. Saya siap mendampingi siswa secara Sokratik dan menyajikan rumus matematika dengan format LaTeX KaTeX.`,
          });
        }

        // Add recent history
        const recentHistory = Array.isArray(history) ? history.slice(-6) : [];
        for (const msg of recentHistory) {
          if (msg && typeof msg.text === 'string' && msg.text.trim()) {
            rawTurns.push({
              role: msg.sender === 'user' ? 'user' : 'model',
              text: msg.text.trim(),
            });
          }
        }

        // Add current user message
        rawTurns.push({
          role: 'user',
          text: message.trim(),
        });

        // Consolidate consecutive turns with the same role to satisfy Gemini API requirements
        const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
        for (const turn of rawTurns) {
          if (contents.length > 0 && contents[contents.length - 1].role === turn.role) {
            contents[contents.length - 1].parts[0].text += `\n${turn.text}`;
          } else {
            contents.push({
              role: turn.role,
              parts: [{ text: turn.text }],
            });
          }
        }

        // Must start with user
        if (contents.length > 0 && contents[0].role !== 'user') {
          contents.unshift({ role: 'user', parts: [{ text: 'Halo' }] });
        }

        let response: any = null;
        let successfulModel = 'gemini-3.8-flash';
        const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
        const activeModels = candidateModels.filter(isModelAvailable);
        const modelsToTry = activeModels.length > 0 ? activeModels : candidateModels;

        const needsWebVerification =
          /(terbaru|kurikulum|saat ini|sekarang|pejabat|menteri|berita|perkembangan|regulasi)/i.test(message);

        // Attempt search grounding if asking for recent facts or curriculum
        if (needsWebVerification) {
          for (const modelName of modelsToTry) {
            try {
              const searchCall = ai.models.generateContent({
                model: modelName,
                contents,
                config: {
                  systemInstruction: TEMAN_BERPIKIR_SYSTEM_PROMPT,
                  temperature: 0.4,
                  tools: [{ googleSearch: {} }],
                },
              });
              const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Search timeout')), 7000)
              );
              response = (await Promise.race([searchCall, timeoutPromise])) as any;
              if (response && response.text) {
                successfulModel = modelName;
                break;
              }
            } catch {
              response = null;
            }
          }
        }

        // Resilient multi-model generation adhering to TEMAN_BERPIKIR_SYSTEM_PROMPT
        if (!response || !response.text) {
          for (const modelName of modelsToTry) {
            try {
              const geminiCall = ai.models.generateContent({
                model: modelName,
                contents,
                config: {
                  systemInstruction: TEMAN_BERPIKIR_SYSTEM_PROMPT,
                  temperature: 0.4,
                },
              });

              const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`Timeout with ${modelName}`)), 6000)
              );

              response = (await Promise.race([geminiCall, timeoutPromise])) as any;
              if (response && response.text) {
                successfulModel = modelName;
                break;
              }
            } catch (modelErr: any) {
              const errMsg = modelErr?.message || String(modelErr);
              const isHighDemandOrQuota =
                modelErr?.status === 503 ||
                modelErr?.status === 429 ||
                /high demand|temporary|UNAVAILABLE|RESOURCE_EXHAUSTED|Timeout/i.test(errMsg);

              if (isHighDemandOrQuota) {
                // Mark model in cooldown so upcoming requests skip it immediately
                markModelCooldown(modelName, 45000);
              }
              // Immediately fall through to next candidate model
              continue;
            }
          }
        }

        const reply = response?.text || '';
        if (reply.trim()) {
          res.json({
            reply: reply.trim(),
            source: 'gemini',
            model: successfulModel,
          });
          return;
        }
      } catch (geminiError: any) {
        console.warn('Gemini API calls failed or timed out, activating intelligent offline fallback:', geminiError?.message || geminiError);
      }
    }

    // Fallback to intelligent offline solver adhering to the prompt
    const offlineReply = generateOfflineTemanBerpikirResponse(message, history);
    res.json({
      reply: offlineReply,
      source: 'offline_engine',
      model: 'teman-berpikir-core',
    });
  } catch (err: any) {
    console.error('Chat endpoint error:', err);
    res.status(500).json({
      error: 'Terjadi kesalahan pada sistem Teman Berpikir AI',
      details: err.message,
    });
  }
});

// 3. Endpoint Generator Konten Game Pembelajaran Otomatis dengan AI
app.post('/api/ai/generate-game', async (req, res) => {
  try {
    const { subject = 'Fisika', topic = 'Kalor & Termodinamika', description = '' } = req.body;
    const ai = getGeminiClient();

    if (ai) {
      try {
        const prompt = `Anda adalah perancang game edukasi interaktif untuk aplikasi pembelajaran sains "TI SENANG".
Rancanglah konten game edukasi yang disesuaikan secara mendalam dengan:
- Mata Pelajaran: ${subject}
- Materi/Topik: ${topic}
- Deskripsi Konteks: ${description || '-'}

Keluarkan HANYA format JSON murni tanpa markdown wrapper/codeblock, dengan struktur persis berikut:
{
  "subjectName": "${subject}",
  "topicTitle": "${topic}",
  "isAiGenerated": true,
  "cards": [
    { "pairId": 1, "text": "Nama Konsep 1" },
    { "pairId": 1, "text": "Rumus / Definisi Singkat Konsep 1" },
    { "pairId": 2, "text": "Nama Konsep 2" },
    { "pairId": 2, "text": "Rumus / Definisi Singkat Konsep 2" },
    { "pairId": 3, "text": "Nama Konsep 3" },
    { "pairId": 3, "text": "Rumus / Definisi Singkat Konsep 3" },
    { "pairId": 4, "text": "Nama Konsep 4" },
    { "pairId": 4, "text": "Rumus / Definisi Singkat Konsep 4" }
  ],
  "puzzleTarget": ["Token1", "=", "Token2", "·", "Token3"],
  "puzzleInitial": ["Token3", "Token1", "=", "·", "Token2"],
  "raceQuestions": [
    {
      "q": "Pertanyaan balapan cepat 1?",
      "options": ["Pilihan A (Benar)", "Pilihan B", "Pilihan C"],
      "correct": 0
    },
    {
      "q": "Pertanyaan balapan cepat 2?",
      "options": ["Pilihan A (Benar)", "Pilihan B", "Pilihan C"],
      "correct": 0
    },
    {
      "q": "Pertanyaan balapan cepat 3?",
      "options": ["Pilihan A (Benar)", "Pilihan B", "Pilihan C"],
      "correct": 0
    }
  ],
  "triviaQuestions": [
    {
      "q": "Pertanyaan cerdas cermat 1?",
      "options": ["Pilihan A (Benar)", "Pilihan B", "Pilihan C"],
      "correct": 0
    },
    {
      "q": "Pertanyaan cerdas cermat 2?",
      "options": ["Pilihan A (Benar)", "Pilihan B", "Pilihan C"],
      "correct": 0
    }
  ],
  "snakeMessages": {
    "ladder1": "🪜 Tangga! Pesan pencapaian pemahaman materi...",
    "ladder2": "🪜 Tangga Prestasi! Pesan apresiasi ketelitian...",
    "snake1": "🐍 Ular Tantangan! Pesan pengingat miskonsepsi...",
    "snake2": "🐍 Ular Tantangan! Pesan pengingat ketelitian..."
  }
}`;

        const candidateModels = ['gemini-2.5-flash', 'gemini-1.5-flash'];
        for (const modelName of candidateModels) {
          try {
            const result = await ai.models.generateContent({
              model: modelName,
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              config: {
                temperature: 0.3,
                responseMimeType: 'application/json',
              },
            });
            const text = result?.text?.trim() || '';
            if (text) {
              const cleaned = text.replace(/```json\n?|```/g, '').trim();
              const parsed = JSON.parse(cleaned);
              if (parsed && Array.isArray(parsed.cards) && parsed.cards.length >= 4) {
                res.json({ ...parsed, isAiGenerated: true });
                return;
              }
            }
          } catch {
            continue;
          }
        }
      } catch (gemErr) {
        console.warn('Gemini game generation failed, activating offline generator:', gemErr);
      }
    }

    const offlineData = getOfflineGameContent(subject, topic);
    res.json(offlineData);
  } catch (err: any) {
    console.error('Game generation endpoint error:', err);
    res.json(getOfflineGameContent());
  }
});

// Setup Vite or static serving
async function startServer() {
  // Serve public static assets (including offline PDF materials, logos, audio)
  app.use(express.static(path.join(process.cwd(), 'public')));

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TI SENANG Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
