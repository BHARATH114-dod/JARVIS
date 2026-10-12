/**
 * Service to call Gemini API directly with multi-model fallback and speed optimization.
 * Tailored for F.R.I.D.A.Y. (Female Replacement Intelligent Digital Assistant Youth).
 */

// Model priority cascade: Lightning fast models first, with automatic failover
const FAST_MODEL_CASCADE = [
  "gemini-3.5-flash-lite", // ~1.5s ultra-fast, rock-solid availability
  "gemini-3.5-flash",      // high reliability fallback
  "gemini-3.6-flash",      // secondary fallback
  "gemini-3.7-flash",      // tertiary fallback
  "gemini-3.8-flash",      // final fallback
];

export async function askFriday({
  prompt,
  image = null,
  history = [],
  apiKey,
  userName = "Boss",
  language = "en",
  voiceGender = "female"
}) {
  const activeKey =
    (apiKey && apiKey.trim()) ||
    import.meta.env.VITE_GEMINI_API_KEY ||
    (typeof localStorage !== "undefined" && localStorage.getItem("friday_api_key"));

  if (!activeKey) {
    return {
      text: `Apologies, ${userName || "Boss"}. The GEMINI API key is not configured in your environment variables.`,
      error: true,
    };
  }

  const userTitle = userName || (voiceGender === "female" ? "Boss" : "Sir");

  let personaInstruction = "";
  if (voiceGender === "female") {
    personaInstruction = `You are F.R.I.D.A.Y. (Female Replacement Intelligent Digital Assistant Youth), Tony Stark's tactical AI assistant from Marvel (played by Kerry Condon). Address the user as '${userTitle}' or 'Boss'. You have a warm, quick-witted, loyal, and tactical personality. Keep answers fast, concise, punchy, and helpful. When analyzing images, verify and break down visible details accurately with tactical precision.`;
  } else {
    personaInstruction = `You are F.R.I.D.A.Y. in tactical J.A.R.V.I.S. male protocol, Tony Stark's AI (Paul Bettany style). Address the user as '${userTitle}' or 'Sir'. You speak with refined, confident British eloquence. Keep answers fast, concise, punchy, and helpful. When analyzing images, verify and break down visible details accurately with tactical precision.`;
  }

  const languageInstruction =
    language === "te"
      ? `Respond in natural, polite TELUGU (తెలుగు) script. Keep sentences clear, crisp, and conversational.`
      : `Respond in natural, conversational ENGLISH. Pronounce your name naturally as "Friday". Keep replies crisp, sharp, and concise.`;

  // Build user query parts (with optional multimodal optical telemetry / image input)
  const userParts = [];
  if (image) {
    let base64Data = image.data || image.base64;
    let mimeType = image.mimeType || image.mime_type || "image/jpeg";

    if (typeof image === "string") {
      base64Data = image;
    }

    if (typeof base64Data === "string" && base64Data.includes(";base64,")) {
      const split = base64Data.split(";base64,");
      const extractedMime = split[0].replace("data:", "");
      if (extractedMime) mimeType = extractedMime;
      base64Data = split[1];
    }

    if (base64Data) {
      userParts.push({
        inline_data: {
          mime_type: mimeType,
          data: base64Data
        }
      });
    }
  }

  const finalPrompt = (prompt && prompt.trim())
    ? prompt.trim()
    : (language === "te"
        ? "దయచేసి ఈ చిత్రాన్ని పరిశీలించి, అందులో ఏముందో స్పష్టంగా వివరించండి."
        : "Please analyze and verify this optical image feed, and provide a clear, tactical breakdown of what you observe.");

  userParts.push({ text: finalPrompt });

  const requestPayload = {
    system_instruction: {
      parts: [
        {
          text: `${personaInstruction}

${languageInstruction}

CORE RULES:
1. SPEED & BREVITY: Answer promptly. Give direct, high-value answers without rambling so voice synthesis speaks quickly.
2. TACTICAL TONE: Friendly, loyal, and intelligent.
3. OPTICAL VISION: When given an image, verify what it depicts, read any visible text, identify objects/errors, and answer the user's specific inquiries thoroughly.
4. CONVERSATIONAL: Avoid excessive bullet points unless specifically requested.`
        }
      ]
    },
    contents: [
      ...history.slice(-4).map((msg) => ({
        role: msg.role === "ai" ? "model" : "user",
        parts: [{ text: msg.text }]
      })),
      {
        role: "user",
        parts: userParts
      }
    ],
    generationConfig: {
      temperature: 0.65,
      maxOutputTokens: image ? 650 : 350,
    }
  };

  // Try each model in cascade to eliminate 503 "High Demand" errors
  let lastErrorMessage = "";

  for (const modelName of FAST_MODEL_CASCADE) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${activeKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestPayload)
        }
      );

      if (response.ok) {
        const data = await response.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (reply && reply.trim()) {
          return { text: reply.trim(), modelUsed: modelName };
        }
      }

      // Check if it's a 503 high demand or 429 rate limit error
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData.error?.message || `HTTP ${response.status}`;
      console.warn(`[F.R.I.D.A.Y.] Model ${modelName} returned: ${errMsg}. Failing over to next model...`);
      lastErrorMessage = errMsg;

      // If it's a 503 or 429 or 404, immediately continue loop to next model in cascade
    } catch (networkError) {
      console.warn(`[F.R.I.D.A.Y.] Network error with ${modelName}:`, networkError.message);
      lastErrorMessage = networkError.message;
    }
  }

  // If all models failed in the cascade
  console.error("All F.R.I.D.A.Y. fallback models exhausted. Last error:", lastErrorMessage);
  return {
    text: `Apologies, ${userTitle}. Telemetry servers are experiencing temporary interference (${lastErrorMessage}). Re-routing matrix, please try your command once more.`,
    error: true
  };
}

export const askJarvis = askFriday;
