/**
 * Service to call Gemini API directly using gemini-3.8-flash.
 */
export async function askJarvis({ prompt, history = [], apiKey, userName = "Sir", language = "en" }) {
  const activeKey = (apiKey && apiKey.trim()) || import.meta.env.VITE_GEMINI_API_KEY;

  if (!activeKey) {
    return {
      text: `Apologies, ${userName || "Sir"}. The VITE_GEMINI_API_KEY is not configured in your environment variables.`,
      error: true,
    };
  }

  try {
    const userTitle = userName || "Sir";
    const languageInstruction = language === "te"
      ? `LANGUAGE REQUIREMENT: Respond in natural, polite, respectful TELUGU (తెలుగు) using standard Telugu script or smooth conversational Telugu. Maintain a respectful, sophisticated male assistant tone (calling the user by name or respectful Telugu phrasing like 'గారు' / '${userTitle}').`
      : `LANGUAGE REQUIREMENT: Respond in refined British ENGLISH with the classic, polite male persona of Paul Bettany's Jarvis from Iron Man. Address the user as '${userTitle}' or 'Sir'.`;

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
                text: `You are J.A.R.V.I.S., Tony Stark's sophisticated AI from the Iron Man movies. You are serving ${userTitle}.

${languageInstruction}

CORE RULES:
1. Speak in a confident, respectful, masculine assistant persona.
2. If language is English, pronounce your name naturally as "Jarvis" (/ˈdʒɑːrvɪs/). Use classic phrases ("At your service", "Certainly, ${userTitle}", "Diagnostics complete").
3. If language is Telugu, respond clearly in elegant, easy-to-understand Telugu without robotic phrasing.
4. Keep spoken responses crisp, insightful, helpful, and concise. Avoid cluttered text so the user can easily read and study.
5. Provide top-tier assistance for programming, concepts, studies, logic, and reasoning.`
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
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Protocol executed, though no telemetry content was returned.";
    return { text: reply };
  } catch (error) {
    console.error("Jarvis API error:", error);
    return {
      text: `Apologies, ${userName || "Sir"}. An error was encountered while communicating with the neural matrix: ${error.message}`,
      error: true
    };
  }
}
