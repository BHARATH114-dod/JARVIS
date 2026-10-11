"""
F.R.I.D.A.Y. System & Hardware Automation Tools
Live CPU, RAM, Battery telemetry, Volume control, and Application Launchers.
"""

import os
import platform
import subprocess
import psutil

CURRENT_OS = platform.system()  # 'Windows', 'Darwin' (macOS), or 'Linux'


def get_hardware_telemetry():
    """Returns live CPU, RAM, and Battery metrics."""
    cpu_pct = psutil.cpu_percent(interval=0.2)
    ram = psutil.virtual_memory()
    ram_pct = ram.percent
    ram_used_gb = ram.used / (1024 ** 3)
    ram_total_gb = ram.total / (1024 ** 3)

    battery_info = psutil.sensors_battery()
    if battery_info:
        battery_pct = round(battery_info.percent)
        is_plugged = battery_info.power_plugged
        charging_str = "charging" if is_plugged else "on battery power"
        battery_str = f"{battery_pct}% and {charging_str}"
    else:
        battery_str = "Desktop / No battery detected"

    report = (
        f"Diagnostic metrics, Boss: CPU load is at {cpu_pct}%, "
        f"RAM utilization is at {ram_pct}% ({ram_used_gb:.1f} of {ram_total_gb:.1f} GB), "
        f"and power is at {battery_str}."
    )
    return report


def launch_application(app_name: str):
    """
    Cross-platform application launcher (VS Code, Chrome, Spotify, Notepad, Terminal, etc.)
    """
    app_lower = app_name.lower().strip()

    # Application aliases mapping
    app_map = {
        "vs code": {"win": "code", "mac": "Visual Studio Code", "linux": "code"},
        "vscode": {"win": "code", "mac": "Visual Studio Code", "linux": "code"},
        "code": {"win": "code", "mac": "Visual Studio Code", "linux": "code"},
        "chrome": {"win": "chrome", "mac": "Google Chrome", "linux": "google-chrome"},
        "google chrome": {"win": "chrome", "mac": "Google Chrome", "linux": "google-chrome"},
        "spotify": {"win": "spotify", "mac": "Spotify", "linux": "spotify"},
        "notepad": {"win": "notepad", "mac": "TextEdit", "linux": "gedit"},
        "calculator": {"win": "calc", "mac": "Calculator", "linux": "gnome-calculator"},
        "terminal": {"win": "wt", "mac": "Terminal", "linux": "gnome-terminal"},
        "powershell": {"win": "powershell", "mac": "Terminal", "linux": "bash"},
    }

    cmd = None
    for alias, targets in app_map.items():
        if alias in app_lower:
            cmd = targets.get("win" if CURRENT_OS == "Windows" else "mac" if CURRENT_OS == "Darwin" else "linux")
            break

    if not cmd:
        cmd = app_lower

    try:
        if CURRENT_OS == "Windows":
            subprocess.Popen(f"start {cmd}", shell=True)
        elif CURRENT_OS == "Darwin":
            subprocess.Popen(["open", "-a", cmd])
        else:
            subprocess.Popen([cmd])

        return f"Opening {app_name} right away, Boss."
    except Exception as e:
        return f"Unable to launch {app_name}. System reported: {e}"


def adjust_volume(action: str, level: int = None):
    """
    Controls master volume across Windows, macOS, and Linux.
    action: 'up', 'down', 'mute', 'unmute', or 'set'
    """
    try:
        if CURRENT_OS == "Windows":
            if action == "mute":
                subprocess.run(
                    ["powershell", "-Command", "(New-Object -ComObject WScript.Shell).SendKeys([char]173)"],
                    capture_output=True, check=False
                )
                return "Audio muted."
            elif action == "up":
                for _ in range(5):
                    subprocess.run(
                        ["powershell", "-Command", "(New-Object -ComObject WScript.Shell).SendKeys([char]175)"],
                        capture_output=True, check=False
                    )
                return "Increasing volume."
            elif action == "down":
                for _ in range(5):
                    subprocess.run(
                        ["powershell", "-Command", "(New-Object -ComObject WScript.Shell).SendKeys([char]174)"],
                        capture_output=True, check=False
                    )
                return "Decreasing volume."

        elif CURRENT_OS == "Darwin":
            if action == "mute":
                subprocess.run(["osascript", "-e", "set volume output muted true"])
                return "Audio muted."
            elif action == "unmute":
                subprocess.run(["osascript", "-e", "set volume output muted false"])
                return "Audio unmuted."
            elif level is not None:
                subprocess.run(["osascript", "-e", f"set volume output volume {min(100, max(0, level))}"])
                return f"Volume set to {level} percent."

        elif CURRENT_OS == "Linux":
            if action == "mute":
                subprocess.run(["amixer", "-D", "pulse", "sset", "Master", "mute"], capture_output=True)
                return "Audio muted."
            elif action == "unmute":
                subprocess.run(["amixer", "-D", "pulse", "sset", "Master", "unmute"], capture_output=True)
                return "Audio unmuted."
            elif action == "up":
                subprocess.run(["amixer", "-D", "pulse", "sset", "Master", "5%+"], capture_output=True)
                return "Volume increased."
            elif action == "down":
                subprocess.run(["amixer", "-D", "pulse", "sset", "Master", "5%-"], capture_output=True)
                return "Volume decreased."

        return "Volume adjustment protocol executed."
    except Exception as e:
        return f"Could not adjust volume: {e}"
