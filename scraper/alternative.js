const axios = require("axios");
const fs = require("fs");

const STREAM_URL = "https://perelive.pages.dev/jiotv.m3u";
const OUTPUT_FILE = "stream.json";

async function fetchAndSaveJson() {
  try {
    const response = await axios.get(STREAM_URL, { responseType: "text" });
    const lines = response.data.split("\n");

    const result = {};

    let currentKid = null;
    let currentKey = null;
    let currentTvgId = null;
    let currentGroup = null;
    let currentLogo = null;
    let currentChannel = null;
    let currentUserAgent = null;
    let currentCookie = null; // 1. Variable to store the cookie

    for (const line of lines) {
      const trimmed = line.trim();

      // Extract info from #EXTINF
      if (trimmed.startsWith("#EXTINF:")) {
        const tvgIdMatch = trimmed.match(/tvg-id="(\d+)"/);
        const groupMatch = trimmed.match(/group-title="([^"]+)"/);
        const logoMatch = trimmed.match(/tvg-logo="([^"]+)"/);
        const channelMatch = trimmed.match(/,(.*)$/);

        currentTvgId = tvgIdMatch ? tvgIdMatch[1] : null;
        currentGroup = groupMatch ? groupMatch[1] : null;
        currentLogo = logoMatch ? logoMatch[1] : null;
        currentChannel = channelMatch ? channelMatch[1] : null;
      }

      // Extract kid and key
      else if (trimmed.startsWith("#KODIPROP:inputstream.adaptive.license_key=")) {
        const [kid, key] = trimmed.split("=")[1].split(":");
        currentKid = kid;
        currentKey = key;
      }

      // Extract user-agent
      else if (trimmed.startsWith("#EXTVLCOPT:http-user-agent=")) {
        currentUserAgent = trimmed.split("=")[1];
      }

      // 2. Extract Cookie from #EXTHTTP
      else if (trimmed.startsWith("#EXTHTTP:")) {
        try {
          // Remove the prefix to get the JSON part
          const jsonStr = trimmed.replace("#EXTHTTP:", "");
          const parsed = JSON.parse(jsonStr);
          
          if (parsed && parsed.cookie) {
            currentCookie = parsed.cookie;
          }
        } catch (e) {
          console.warn("Skipping malformed EXTHEADER line");
        }
      }

      // Extract URL and build object
      else if (currentKid && currentKey && currentTvgId && trimmed.startsWith("http")) {
        // Remove extra &xxx=... if present
        const cleanUrl = trimmed.split("&xxx=")[0];

        // 3. Append cookie to URL if it exists
        let finalUrl = cleanUrl;
        if (currentCookie) {
          finalUrl += `?${currentCookie}`;
        }

        result[currentTvgId] = {
          kid: currentKid,
          key: currentKey,
          url: finalUrl,
          group_title: currentGroup,
          tvg_logo: currentLogo,
          channel_name: currentChannel,
          user_agent: currentUserAgent
        };

        // Reset for next entry
        currentKid = null;
        currentKey = null;
        currentTvgId = null;
        currentGroup = null;
        currentLogo = null;
        currentChannel = null;
        currentUserAgent = null;
        currentCookie = null; // 4. Reset cookie
      }
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), "utf-8");
    console.log("✅ stream.json saved successfully.");

  } catch (err) {
    console.error("❌ Failed to fetch M3U:", err.message);
    process.exit(1);
  }
}

fetchAndSaveJson();