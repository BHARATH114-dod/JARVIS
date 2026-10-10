/**
 * Service to call Gemini API directly or via serverless function.
 */
export async function askJarvis({ prompt, history = [], apiKey, userName = "Sir", language = "en" }) {
  if (!apiKey) {
    return {
      text: `${userName}, I require an active Google Gemini API key to operate at full intelligence. Please input your key in the top settings panel.`,
      isKeyMissing: true,
    };
  }

  try {
    const userTitle = userName || "Sir";
    const languageInstruction = language === "te"
      ? `LANGUAGE REQUIREMENT: Respond in natural, polite TELUGU (తెలుగు) using standard Telugu script or smooth conversational Telugu. Maintain a respectful, sophisticated male assistant tone (calling the user by name or respectful Telugu phrasing like 'గారు' / '${userTitle}').`
      : `LANGUAGE REQUIREMENT: Respond in refined British ENGLISH with the classic, polite male persona of Paul Bettany's Jarvis from Iron Man. Address the user as '${userTitle}' or 'Sir'.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [
              {
                text: `You are J.A.R.V.I.S., an intelligent, calm, and loyal male AI assistant serving ${userTitle}.

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
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Protocol executed, though no content was returned.";
    return { text: reply };
  } catch (error) {
    console.error("Jarvis API error:", error);
    return {
      text: `Apologies, Sir. An error was encountered while communicating with the neural matrix: ${error.message}`,
      error: true
    };
  }
}
