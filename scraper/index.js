const axios = require("axios");
const fs = require("fs");

const STREAM_URL = "https://zio.vodep39240327.workers.dev/";
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

      // Extract URL after license
      else if (currentKid && currentKey && currentTvgId && trimmed.startsWith("http")) {

        // ❌ SKIP THE FIRST ENTRY (sf-top)
        if (currentTvgId === "sf-top") {
          currentKid = null;
          currentKey = null;
          currentTvgId = null;
          currentGroup = null;
          currentLogo = null;
          currentChannel = null;
          currentUserAgent = null;
          continue;
        }

        // Remove extra &xxx=... if present
        let cleanUrl = trimmed.split("&xxx=")[0];

        // --- MODIFICATION START ---
        cleanUrl = cleanUrl.replace("jiotvbpkmob.cdn.jio.com", "jiotvbpkmob.cdn.jio.com");
        // --- MODIFICATION END ---

        result[currentTvgId] = {
          kid: currentKid,
          key: currentKey,
          url: cleanUrl,
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
