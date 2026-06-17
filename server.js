const express = require('express');
const YTDlpWrap = require('yt-dlp-wrap').default;
const ytDlpWrap = new YTDlpWrap(); // Make sure yt-dlp binary is installed on server
const app = express();

app.get('/get-audio', async (req, res) => {
    const videoUrl = req.query.url; // Example: https://www.youtube.com/watch?v=...
    if (!videoUrl) return res.status(400).json({ error: 'URL is required' });

    try {
        // yt-dlp se direct audio stream URL nikalna
        let audioUrl = await ytDlpWrap.execPromise([
            videoUrl,
            '-f', 'ba', // 'ba' means best audio
            '-g'        // '-g' means only get the direct URL
        ]);

        res.json({ audio_url: audioUrl.trim() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => console.log('Server running on port 3000'));

