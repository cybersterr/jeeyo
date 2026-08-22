const axios = require("axios");
const fs = require("fs");

const STREAM_URL = process.env.STREAM_URL;

const OUTPUT_FILE = "stream.json";

async function fetchAndSaveJson() {
  try {
    if (!STREAM_URL) {
      throw new Error("STREAM_URL secret not found.");
    }

    const response = await axios.get(STREAM_URL, {
      responseType: "text"
    });

    const lines = response.data.split(/\r?\n/);

    const result = [];

    let currentKid = null;
    let currentKey = null;
    let currentId = null;
    let currentCategory = null;
    let currentLogo = null;
    let currentName = null;
    let currentCookie = null;

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#EXTM3U")) {
        continue;
      }

      // Extract channel information
      if (trimmed.startsWith("#EXTINF:")) {
        const tvgIdMatch = trimmed.match(/tvg-id="([^"]+)"/);
        const groupMatch = trimmed.match(/group-title="([^"]+)"/);
        const logoMatch = trimmed.match(/tvg-logo="([^"]+)"/);
        const nameMatch = trimmed.match(/,(.*)$/);

        currentId = tvgIdMatch ? tvgIdMatch[1] : null;
        currentCategory = groupMatch ? groupMatch[1] : null;
        currentLogo = logoMatch ? logoMatch[1] : null;
        currentName = nameMatch ? nameMatch[1].trim() : null;
      }

      // Extract ClearKey
      else if (
        trimmed.startsWith(
          "#KODIPROP:inputstream.adaptive.license_key="
        )
      ) {
        const value = trimmed.split("=").slice(1).join("=");

        if (value.includes(":")) {
          const [kid, key] = value.split(":");

          currentKid = kid.trim();
          currentKey = key.trim();
        } else {
          currentKid = null;
          currentKey = value.trim();
        }
      }

      // Extract cookie from #EXTHTTP
      else if (
        trimmed.startsWith("#EXTVLCOPT:http-referrer=")
      ) {
        // Ignore referrer
      }

      // Extract URL and build output
      else if (trimmed.startsWith("http")) {
        // Skip sf-top
        if (currentId === "sf-top") {
          currentKid = null;
          currentKey = null;
          currentId = null;
          currentCategory = null;
          currentLogo = null;
          currentName = null;
          currentCookie = null;
          continue;
        }

        const cleanUrl = trimmed.split("&xxx=")[0];

        // Extract __hdnea__ cookie from URL
        try {
          const parsedUrl = new URL(cleanUrl);
          currentCookie = parsedUrl.searchParams.get("__hdnea__");

          if (currentCookie) {
            currentCookie =
              "__hdnea__=" + currentCookie;
          }
        } catch {
          currentCookie = null;
        }

        // Extract expiry time from cookie
        let expireTime = null;

        if (currentCookie) {
          const expMatch =
            currentCookie.match(/exp=(\d+)/);

          expireTime = expMatch
            ? expMatch[1]
            : null;
        }

        result.push({
          name: currentName,
          id: currentId,
          category: currentCategory,
          keyId: currentKid,
          key: currentKey,
          logo: currentLogo,
          url: cleanUrl,
          cookie: currentCookie,
          expire_time: expireTime
        });

        // Reset values
        currentKid = null;
        currentKey = null;
        currentId = null;
        currentCategory = null;
        currentLogo = null;
        currentName = null;
        currentCookie = null;
      }
    }

    fs.writeFileSync(
      OUTPUT_FILE,
      JSON.stringify(result, null, 2),
      "utf-8"
    );

    console.log(
      `✅ stream.json saved successfully. ${result.length} channels found.`
    );

  } catch (err) {
    console.error(
      "❌ Failed to fetch M3U:",
      err.message
    );

    process.exit(1);
  }
}

fetchAndSaveJson();
