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
      responseType: "json"
    });

    const data = response.data;

    if (!Array.isArray(data)) {
      throw new Error("Fetched data is not a JSON array.");
    }

    const result = data.map(channel => ({
      name: channel.name || null,
      id: channel.id || null,
      category: channel.category || null,
      keyId: channel.keyId || null,
      key: channel.key || null,
      logo: channel.logo || null,
      url: channel.url || null,
      cookie: channel.cookie || null,
      expire_time: channel.expire_time || null
    }));

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
      "❌ Failed to fetch JSON:",
      err.message
    );
    process.exit(1);
  }
}

fetchAndSaveJson();
