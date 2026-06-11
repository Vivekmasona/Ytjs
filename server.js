import express from "express";
import { Innertube } from "youtubei.js";

const app = express();
const port = process.env.PORT || 3000;

const yt = await Innertube.create();

app.get("/", (req, res) => {
  res.json({
    status: true,
    message: "YouTube Audio API Running"
  });
});

app.get("/audio", async (req, res) => {
  try {
    const id = req.query.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Missing video id"
      });
    }

    const info = await yt.getInfo(id);

    const audio = info.streaming_data.adaptive_formats
      .filter(x => x.has_audio && !x.has_video)
      .sort((a, b) => b.bitrate - a.bitrate);

    res.json({
      success: true,
      title: info.basic_info.title,
      channel: info.basic_info.author,
      thumbnail: info.basic_info.thumbnail?.[0]?.url,
      audio: audio.map(x => ({
        itag: x.itag,
        bitrate: x.bitrate,
        mime: x.mime_type,
        url: x.url
      }))
    });

  } catch (e) {
    res.status(500).json({
      success: false,
      error: e.message
    });
  }
});

app.listen(port, () => {
  console.log("Server running on", port);
});
