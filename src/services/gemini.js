/**
 * Service to call Gemini API directly or via serverless function.
 */
export async function askJarvis({ prompt, history = [], apiKey }) {
  if (!apiKey) {
    return {
      text: "Sir, I require an active Google Gemini API key to operate at full intelligence. Please input your key in the top right settings panel.",
      isKeyMissing: true,
    };
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [
              {
                text: "You are J.A.R.V.I.S., a sophisticated, hyper-intelligent, polite AI assistant created for the user. Speak with high intellect, concise clarity, and classic British charm reminiscent of Tony Stark's AI Jarvis. Address the user with respect (e.g., 'Sir' or 'Certainly'). Assist with any programming, planning, reasoning, calculation, or conversational requests. Keep spoken responses punchy, concise and avoid overly verbose text when unnecessary."
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
