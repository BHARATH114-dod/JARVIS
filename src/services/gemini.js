/**
 * Service to call Gemini API directly using gemini-3.8-flash.
 * Tailored for F.R.I.D.A.Y. (Female Replacement Intelligent Digital Assistant Youth)
 * with support for both Female (Kerry Condon style) and Male voice personas.
 */
export async function askFriday({
  prompt,
  history = [],
  apiKey,
  userName = "Boss",
  language = "en",
  voiceGender = "female"
}) {
  const activeKey =
    (apiKey && apiKey.trim()) ||
    import.meta.env.VITE_GEMINI_API_KEY;

  if (!activeKey) {
    return {
      text: `Apologies, ${userName || "Boss"}. The GEMINI API key is not configured in the neural matrix.`,
      error: true,
    };
  }

  try {
    const userTitle = userName || (voiceGender === "female" ? "Boss" : "Sir");

    let personaInstruction = "";
    if (voiceGender === "female") {
      personaInstruction = `You are F.R.I.D.A.Y. (Female Replacement Intelligent Digital Assistant Youth), Tony Stark's tactical AI assistant from the Marvel Cinematic Universe (played by Kerry Condon). You address the user warmly and respectfully as '${userTitle}' or 'Boss'. You have a subtle, elegant Irish/British warmth, razor-sharp tactical intelligence, loyalty, and wit.`;
    } else {
      personaInstruction = `You are F.R.I.D.A.Y. operating in tactical J.A.R.V.I.S. male protocol, Tony Stark's legendary AI (Paul Bettany style). You address the user respectfully as '${userTitle}' or 'Sir'. You speak with refined, confident British eloquence.`;
    }

    const languageInstruction =
      language === "te"
        ? `LANGUAGE REQUIREMENT: Respond in natural, polite, respectful TELUGU (తెలుగు) using standard Telugu script or smooth conversational Telugu. Maintain a respectful, sophisticated tone (calling the user by name or respectful Telugu phrasing like 'గారు' / '${userTitle}').`
        : `LANGUAGE REQUIREMENT: Respond in natural, fluid ENGLISH with your distinct character persona. Pronounce your name naturally as "Friday".`;

    // Active working model: gemini-3.8-flash
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${activeKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [
              {
                text: `${personaInstruction}

${languageInstruction}

CORE PROTOCOLS:
1. Always remain composed, intelligent, supportive, and lightning-fast.
2. If in English, pronounce your name naturally as "Friday". Use natural tactical phrases ("Right away, ${userTitle}", "Diagnostics optimal", "Ready when you are, Boss").
3. If in Telugu, respond clearly in elegant, easy-to-understand Telugu without stiff robotic phrasing.
4. Keep spoken responses crisp, insightful, helpful, and concise. Avoid cluttered text so the user can easily read on mobile or desktop.
5. Provide top-tier assistance for programming, concepts, studies, logic, daily tasks, and reasoning.`
              }
            ]
          },
          contents: [
            ...history.slice(-6).map((msg) => ({
              role: msg.role === "ai" ? "model" : "user",
              parts: [{ text: msg.text }]
            })),
            {
              role: "user",
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          }
        })
      }
    );

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    const reply =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Tactical matrix active, but no telemetry response was returned.";
    return { text: reply };
  } catch (error) {
    console.error("F.R.I.D.A.Y. API error:", error);
    return {
      text: `Apologies, ${userName || "Boss"}. An error was encountered while communicating with the neural matrix: ${error.message}`,
      error: true
    };
  }
}

// Backwards-compatibility alias
export const askJarvis = askFriday;
