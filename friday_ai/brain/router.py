"""
F.R.I.D.A.Y. Intent Router & Command Dispatcher
Evaluates incoming voice commands and directs them to local OS tools, Web tools, or the LLM brain.
"""

import re
from friday_ai.brain.llm import clear_memory, query_llm
from friday_ai.tools.system_tools import adjust_volume, get_hardware_telemetry, launch_application
from friday_ai.tools.web_tools import (
    get_current_time_and_date,
    get_realtime_weather,
    get_wikipedia_summary,
    perform_google_search,
)


def dispatch_command(command: str) -> str:
    """
    Evaluates command text and routes to appropriate subsystem.
    """
    cmd = command.lower().strip()

    # 1. System Telemetry (CPU / RAM / Battery)
    if any(k in cmd for k in ["system status", "diagnostics", "battery", "cpu", "ram", "memory usage", "hardware"]):
        return get_hardware_telemetry()

    # 2. Volume Controls
    if "mute" in cmd:
        return adjust_volume("mute")
    if "unmute" in cmd:
        return adjust_volume("unmute")
    if "volume up" in cmd or "increase volume" in cmd or "louder" in cmd:
        return adjust_volume("up")
    if "volume down" in cmd or "decrease volume" in cmd or "quieter" in cmd:
        return adjust_volume("down")

    # 3. Application Launcher ("open chrome", "launch vscode", "open spotify")
    app_match = re.search(r"(?:open|launch|start)\s+([a-zA-Z0-9\s]+)", cmd)
    if app_match:
        target = app_match.group(1).strip()
        # Avoid false positives like "open weather" or "open time"
        if target not in ["the weather", "weather", "time"]:
            return launch_application(target)

    # 4. Time and Date
    if any(k in cmd for k in ["what time is it", "current time", "what's the time", "what is the date", "today's date", "what day is it"]):
        return get_current_time_and_date()

    # 5. Weather Telemetry
    weather_match = re.search(r"weather(?:\s+in|\s+for)?\s*([a-zA-Z\s]*)", cmd)
    if "weather" in cmd:
        city = ""
        if weather_match and weather_match.group(1):
            city = weather_match.group(1).strip()
        return get_realtime_weather(city)

    # 6. Wikipedia Summary Lookup
    wiki_match = re.search(r"(?:who is|who was|tell me about|wikipedia|what is a|what is an|explain)\s+([a-zA-Z0-9\s]+)", cmd)
    if wiki_match and not any(k in cmd for k in ["weather", "time", "date", "cpu", "battery"]):
        topic = wiki_match.group(1).strip()
        return get_wikipedia_summary(topic)

    # 7. Explicit Google Search
    search_match = re.search(r"(?:google|search for|search google for)\s+([a-zA-Z0-9\s]+)", cmd)
    if search_match:
        query = search_match.group(1).strip()
        return perform_google_search(query)

    # 8. Reset Memory
    if "clear memory" in cmd or "forget our conversation" in cmd:
        clear_memory()
        return "Conversation memory purged, Boss. Starting fresh."

    # 9. Conversational LLM Brain (General queries, calculations, programming, logic)
    return query_llm(command)
