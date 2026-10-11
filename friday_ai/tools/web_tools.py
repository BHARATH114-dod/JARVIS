"""
F.R.I.D.A.Y. Web Intelligence Tools
Wikipedia summaries, Google search, real-time weather and time/date reporting.
"""

import datetime
import urllib.parse
import webbrowser
import requests


def get_current_time_and_date():
    """Returns local time and date formatted for natural speech."""
    now = datetime.datetime.now()
    time_str = now.strftime("%I:%M %p")
    date_str = now.strftime("%A, %B %d, %Y")
    return f"The current time is {time_str}, on {date_str}, Boss."


def get_wikipedia_summary(topic: str):
    """
    Fetches a concise 2-sentence summary from Wikipedia REST API.
    Zero scraping, ultra-low latency.
    """
    clean_topic = topic.strip().replace(" ", "_")
    url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(clean_topic)}"

    try:
        resp = requests.get(url, headers={"User-Agent": "FridayAI/1.0"}, timeout=3.0)
        if resp.status_code == 200:
            data = resp.json()
            extract = data.get("extract", "")
            if extract:
                # Return first two sentences to keep voice output punchy
                sentences = extract.split(". ")
                short_summary = ". ".join(sentences[:2])
                if not short_summary.endswith("."):
                    short_summary += "."
                return f"According to Wikipedia: {short_summary}"
        return f"I couldn't find a direct Wikipedia entry for {topic}, Boss."
    except Exception as e:
        return f"Wikipedia search encountered a connection issue: {e}"


def perform_google_search(query: str):
    """Opens browser search query and speaks confirmation."""
    encoded = urllib.parse.quote(query)
    search_url = f"https://www.google.com/search?q={encoded}"
    try:
        webbrowser.open(search_url)
        return f"Pulling up Google search results for {query} on your display."
    except Exception as e:
        return f"Unable to launch browser: {e}"


def get_realtime_weather(city: str = ""):
    """
    Queries real-time weather via wttr.in JSON API (no API key required, 100% reliable).
    """
    location = urllib.parse.quote(city.strip()) if city else ""
    url = f"https://wttr.in/{location}?format=j1"

    try:
        resp = requests.get(url, timeout=3.5)
        if resp.status_code == 200:
            data = resp.json()
            current = data["current_condition"][0]
            temp_c = current.get("temp_C")
            temp_f = current.get("temp_F")
            desc = current["weatherDesc"][0]["value"]
            humidity = current.get("humidity")
            nearest_area = data.get("nearest_area", [{}])[0].get("areaName", [{}])[0].get("value", city or "your area")

            return (
                f"Weather report for {nearest_area}: It's currently {desc.lower()} "
                f"at {temp_c}°C ({temp_f}°F), with {humidity}% humidity."
            )
        return "I was unable to retrieve the telemetry for that location."
    except Exception:
        return "Weather satellites are currently unresponsive. Please check your network connection."
