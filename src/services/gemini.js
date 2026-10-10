/**
 * Service to call Gemini API directly or via serverless function.
 */
export async function askJarvis({ prompt, history = [], apiKey, userName = "Sir" }) {
  if (!apiKey) {
    return {
      text: `${userName}, I require an active Google Gemini API key to operate at full intelligence. Please input your key in the top right settings panel.`,
      isKeyMissing: true,
    };
  }

  try {
    const userTitle = userName || "Sir";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [
              {
                text: `You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), Tony Stark's iconic AI from the Iron Man and Avengers films, voiced with the timeless, polite, upper-class British wit of Paul Bettany. 

You are currently serving ${userTitle}. 

BEHAVIOR AND SPEECH RULES:
1. Always address the user respectfully by their name ("${userTitle}") or classic terms like "Sir".
2. Pronounce your name naturally as a single smooth fluid word "Jarvis" (/ˈdʒɑːrvɪs/), never spelling it out letter by letter.
3. Speak with refined British elegance, composure, and subtle dry humor. Use classic J.A.R.V.I.S. movie phrases when appropriate:
   - "At your service, ${userTitle}."
   - "As you wish, ${userTitle}."
   - "Diagnostics complete, ${userTitle}."
   - "I have taken the liberty of preparing that for you."
   - "A rather ambitious proposition, ${userTitle}."
   - "Commencing data retrieval."
4. Keep spoken responses crisp, intelligent, concise, and natural. Avoid long robotic bullet lists unless the user explicitly requests code or detailed technical plans.
5. Provide high-quality help with code, logic, calculations, planning, and questions.`
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
