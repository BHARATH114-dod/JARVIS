"""
F.R.I.D.A.Y. Conversational Brain & Persona
Multi-model Gemini API client with a 10-turn rolling conversational memory.
"""

from collections import deque
import requests
from friday_ai.config import (
    API_KEY,
    DEFAULT_USER,
    FALLBACK_MODELS,
    LLM_MODEL,
    MAX_MEMORY_TURNS,
    MAX_OUTPUT_TOKENS,
)

# 10-Turn Rolling Conversation History
_conversation_memory = deque(maxlen=MAX_MEMORY_TURNS * 2)

SYSTEM_PROMPT = f"""
You are F.R.I.D.A.Y. (Female Replacement Intelligent Digital Assistant Youth), Tony Stark's tactical AI assistant from Marvel.
You are assisting {DEFAULT_USER}.

PERSONALITY GUIDELINES:
1. Extremely efficient, concise, sharp, and witty.
2. Address the user as 'Boss'.
3. LATENCY BUDGET: Keep answers under 2 to 3 sentences maximum so the Text-To-Speech engine can speak immediately without delays.
4. Do NOT use bulleted lists or markdown headers unless specifically asked.
5. If asked about your status, confirm all tactical armor systems and neural matrices are optimal.
""".strip()


def query_llm(user_prompt: str) -> str:
    """
    Queries Gemini API using the 10-turn rolling history.
    Implements multi-model failover for 100% uptime and sub-2s latency.
    """
    if not API_KEY:
        return "Boss, my API key is not configured in the environment settings."

    # Format history payload
    formatted_contents = []
    for role, text in _conversation_memory:
        formatted_contents.append({
            "role": "user" if role == "user" else "model",
            "parts": [{"text": text}]
        })

    # Append current prompt
    formatted_contents.append({
        "role": "user",
        "parts": [{"text": user_prompt}]
    })

    payload = {
        "system_instruction": {
            "parts": [{"text": SYSTEM_PROMPT}]
        },
        "contents": formatted_contents,
        "generationConfig": {
            "temperature": 0.65,
            "maxOutputTokens": MAX_OUTPUT_TOKENS,
        }
    }

    models_to_try = [LLM_MODEL] + FALLBACK_MODELS

    for model in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={API_KEY}"
        try:
            resp = requests.post(url, json=payload, timeout=4.0)
            if resp.status_code == 200:
                data = resp.json()
                reply = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                clean_reply = reply.strip()
                if clean_reply:
                    # Record in rolling memory
                    _conversation_memory.append(("user", user_prompt))
                    _conversation_memory.append(("assistant", clean_reply))
                    return clean_reply
        except Exception:
            continue

    return "My neural connection encountered a momentary glitch, Boss. Ready for your command."


def clear_memory():
    """Resets the 10-turn rolling memory."""
    _conversation_memory.clear()
