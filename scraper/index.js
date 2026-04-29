const axios = require("axios");
const fs = require("fs");

const STREAM_URL = process.env.STREAM_URL;

const OUTPUT_FILE = "stream.json";

async function fetchAndSaveJson() {
  try {
    if (!STREAM_URL) {
      throw new Error("STREAM_URL secret not found.");
    }

    const response = await axios.get(STREAM_URL, { responseType: "text" });
    const lines = response.data.split("\n");

    const result = {
      channels: {}
    };

    let currentKid = null;
    let currentKey = null;
    let currentTvgId = null;
    let currentGroup = null;
    let currentLogo = null;
    let currentChannel = null;
    let currentUserAgent = null;

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip #EXTM3U line
      if (trimmed.startsWith("#EXTM3U")) {
        continue;
      }

      // Extract info from #EXTINF
      if (trimmed.startsWith("#EXTINF:")) {
        const tvgIdMatch = trimmed.match(/tvg-id="([^"]+)"/);
        const groupMatch = trimmed.match(/group-title="([^"]+)"/);
        const logoMatch = trimmed.match(/tvg-logo="([^"]+)"/);
        const channelMatch = trimmed.match(/,(.*)$/);

        currentTvgId = tvgIdMatch ? tvgIdMatch[1] : null;
        currentGroup = groupMatch ? groupMatch[1] : null;
        currentLogo = logoMatch ? logoMatch[1] : null;
        currentChannel = channelMatch ? channelMatch[1].trim() : null;
      }

      // Extract clearkey
      else if (
        trimmed.startsWith(
          "#KODIPROP:inputstream.adaptive.license_key="
        )
      ) {
        const value = trimmed.split("=")[1];

        if (value.includes(":")) {
          const [kid, key] = value.split(":");
          currentKid = kid;
          currentKey = key;
        } else {
          currentKid = null;
          currentKey = value;
        }
      }

      // Extract user-agent
      else if (trimmed.startsWith("#EXTVLCOPT:http-user-agent=")) {
        currentUserAgent = trimmed.split("=")[1];
      }

      // Extract stream URL
      else if (trimmed.startsWith("http")) {
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

        let cleanUrl = trimmed.split("&xxx=")[0];

        result.channels[currentTvgId || currentChannel] = {
          tvg_id: currentTvgId,
          channel_name: currentChannel,
          tvg_logo: currentLogo,
          group_title: currentGroup,
          license_type: "clearkey",
          kid: currentKid,
          key: currentKey,
          url: cleanUrl,
          user_agent: currentUserAgent
        };

        // Reset values
        currentKid = null;
        currentKey = null;
        currentTvgId = null;
        currentGroup = null;
        currentLogo = null;
        currentChannel = null;
        currentUserAgent = null;
      }
    }

    fs.writeFileSync(
      OUTPUT_FILE,
      JSON.stringify(result, null, 2),
      "utf-8"
    );

    console.log("✅ stream.json saved successfully.");
  } catch (err) {
    console.error("❌ Failed to fetch M3U:", err.message);
    process.exit(1);
  }
}

fetchAndSaveJson();
