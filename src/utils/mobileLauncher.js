/**
 * Mobile App Deep-Linking & Intent Launcher Utility
 * Allows F.R.I.D.A.Y. to open native Android & iOS mobile applications via URI schemes.
 */

export const SUPPORTED_MOBILE_APPS = [
  {
    id: "youtube",
    name: "YouTube",
    keywords: ["youtube", "yt", "యూట్యూబ్"],
    deepLink: "vnd.youtube://",
    webUrl: "https://www.youtube.com",
    searchUrl: "https://www.youtube.com/results?search_query=",
    icon: "youtube"
  },
  {
    id: "spotify",
    name: "Spotify",
    keywords: ["spotify", "స్పాటిఫై", "music", "పాటలు"],
    deepLink: "spotify://",
    webUrl: "https://open.spotify.com",
    searchUrl: "https://open.spotify.com/search/",
    icon: "music"
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    keywords: ["whatsapp", "వాట్సాప్", "chat", "message"],
    deepLink: "whatsapp://send",
    webUrl: "https://web.whatsapp.com",
    icon: "message"
  },
  {
    id: "maps",
    name: "Google Maps",
    keywords: ["maps", "google maps", "మ్యాప్స్", "navigation", "directions", "దారి"],
    deepLink: "https://maps.google.com",
    webUrl: "https://maps.google.com",
    searchUrl: "https://maps.google.com/maps?q=",
    icon: "map"
  },
  {
    id: "instagram",
    name: "Instagram",
    keywords: ["instagram", "insta", "ఇన్‌స్టాగ్రామ్"],
    deepLink: "instagram://app",
    webUrl: "https://www.instagram.com",
    icon: "camera"
  },
  {
    id: "twitter",
    name: "X / Twitter",
    keywords: ["twitter", "ట్విట్టర్", "x app"],
    deepLink: "twitter://",
    webUrl: "https://x.com",
    icon: "share"
  },
  {
    id: "gmail",
    name: "Gmail",
    keywords: ["gmail", "email", "mail", "ఈమెయిల్"],
    deepLink: "mailto:",
    webUrl: "https://mail.google.com",
    icon: "mail"
  },
  {
    id: "phone",
    name: "Phone Dialer",
    keywords: ["phone", "dialer", "call", "ఫోన్", "కాల్"],
    deepLink: "tel:",
    webUrl: "tel:",
    icon: "phone"
  },
  {
    id: "google",
    name: "Google Search",
    keywords: ["google", "search", "శోధించు"],
    deepLink: "https://www.google.com",
    webUrl: "https://www.google.com",
    searchUrl: "https://www.google.com/search?q=",
    icon: "search"
  }
];

/**
 * Detects if user prompt is requesting to open or search within a mobile application.
 */
export function detectMobileAppIntent(prompt = "", language = "en") {
  const clean = prompt.toLowerCase().trim();

  // Trigger words like 'open', 'launch', 'start', 'play', 'తెరువు', 'ఓపెన్'
  const isLaunchCommand =
    /(?:open|launch|start|play|go to|show me|run|ఓపెన్|తెరువు|ప్లే)\s+/i.test(clean) ||
    clean.startsWith("open ") ||
    clean.startsWith("launch ") ||
    clean.startsWith("play ") ||
    clean.includes("whatsapp") ||
    clean.includes("youtube") ||
    clean.includes("spotify") ||
    clean.includes("maps");

  if (!isLaunchCommand) return null;

  for (const app of SUPPORTED_MOBILE_APPS) {
    for (const kw of app.keywords) {
      if (clean.includes(kw)) {
        let launchUrl = app.webUrl;
        let query = "";

        // Check for search queries (e.g. "open youtube and search iron man" or "maps to hyderabad")
        const searchRegex = new RegExp(`(?:${kw}|for|to|query)\\s+([a-zA-Z0-9\\s]+)$`, "i");
        const match = clean.match(searchRegex);
        if (match && match[1] && app.searchUrl) {
          query = match[1].trim();
          if (query && query !== kw) {
            launchUrl = `${app.searchUrl}${encodeURIComponent(query)}`;
          }
        }

        // Phone call handling (e.g. "call 9876543210")
        if (app.id === "phone") {
          const numberMatch = clean.match(/\d{5,15}/);
          if (numberMatch) {
            launchUrl = `tel:${numberMatch[0]}`;
          }
        }

        const replyText = language === "te"
          ? `${app.name} మొబైల్ యాప్‌ను ఓపెన్ చేస్తున్నాను, బాస్.`
          : `Launching ${app.name} on your mobile device right away, Boss.`;

        return {
          matched: true,
          app: app,
          query: query,
          replyText: replyText,
          launchUrl: launchUrl,
          deepLink: app.deepLink
        };
      }
    }
  }

  return null;
}

/**
 * Triggers mobile app deep-linking in browser with fallback.
 */
export function triggerMobileLaunch(url) {
  if (!url || typeof window === "undefined") return;

  try {
    // Attempt opening in a new tab/window which mobile browsers seamlessly hand off to native apps
    const opened = window.open(url, "_blank");
    if (!opened || opened.closed || typeof opened.closed === "undefined") {
      // If popup was blocked by browser, fallback to direct location dispatch
      window.location.href = url;
    }
  } catch (err) {
    console.warn("Mobile deep-link redirection failed:", err);
    window.location.href = url;
  }
}
