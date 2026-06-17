const express = require('express');
const fs = require('fs');
const path = require('path');
const YTDlpWrap = require('yt-dlp-wrap').default;
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

const binaryPath = path.join(__dirname, 'yt-dlp');
let ytDlpWrap;

// CORS Middleware
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.use(express.json());

// Auto-download yt-dlp binary
async function initializeYTDlp() {
    if (!fs.existsSync(binaryPath)) {
        console.log('Downloading yt-dlp binary...');
        try {
            await YTDlpWrap.downloadFromGithub(binaryPath);
            console.log('yt-dlp download complete!');
            if (process.platform !== 'win32') {
                fs.chmodSync(binaryPath, '755');
            }
        } catch (err) {
            console.error('yt-dlp download failed:', err);
            process.exit(1);
        }
    }
    ytDlpWrap = new YTDlpWrap(binaryPath);
}

// Main API Route
app.get('/get-audio', async (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).json({ error: 'URL is required' });

    if (!ytDlpWrap) {
        return res.status(503).json({ error: 'Server is initializing yt-dlp, please try again.' });
    }

    // Video ID extract karna
    let videoId = "";
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = videoUrl.match(regExp);
    if (match && match[2].length === 11) {
        videoId = match[2];
    }

    // -------------------------------------------------------------
    // PLAN A: Local yt-dlp check
    // -------------------------------------------------------------
    try {
        const cookiesPath = path.join(__dirname, 'cookies.txt');
        let args = [videoUrl, '-f', 'ba', '-g'];
        
        if (fs.existsSync(cookiesPath)) {
            args.push('--cookies', cookiesPath);
        }

        let audioUrl = await ytDlpWrap.execPromise(args);
        console.log("Success: Audio extracted via yt-dlp");
        return res.json({ source: 'yt-dlp', audio_url: audioUrl.trim() });

    } catch (error) {
        console.log("⚠️ Plan A failed. Switching to Bulletproof Plan B (Alternative Downloader Server)...");
        
        if (!videoId) {
            return res.status(500).json({ error: "Invalid YouTube URL structure" });
        }

        // -------------------------------------------------------------
        // PLAN B: Public High-Speed YouTube to MP3 Mirror API (Anti-Bot Bypass)
        // -------------------------------------------------------------
        try {
            // Yeh ek high-speed public secondary mirror infrastructure hai jo fail nahi hota
            const alternativeApiUrl = `https://api.vexdh.xyz/download/mp3?url=${encodeURIComponent(videoUrl)}`;
            
            const response = await fetch(alternativeApiUrl);
            const data = await response.json();

            if (data && data.download_url) {
                console.log("Success: Audio extracted via Mirror API");
                return res.json({ source: 'mirror-api', audio_url: data.download_url });
            }
            
            // Agar pehla mirror fail ho toh Second Mirror Link (y2mate gateway proxy)
            const backupMirror = `https://youtube-mp36.p.rapidapi.com/dl?id=${videoId}`; 
            // Agar bina rapid api key ke direct call karna hai toh is global proxy ko use karein:
            const globalFallback = `https://t-mp3.com/api/json/convert/${videoId}`;
            
            const fbResponse = await fetch(globalFallback);
            const fbData = await fbResponse.json();
            
            if(fbData && fbData.result && fbData.result.url) {
                console.log("Success: Audio extracted via Global Secondary Fallback");
                return res.json({ source: 'global-fallback', audio_url: fbData.result.url });
            }

            throw new Error("All mirrors failed to respond");

        } catch (fallbackError) {
            return res.status(500).json({ 
                error: "Sabhhi methods fail ho gaye. YouTube ne poori tarah block kiya hai.", 
                plan_a_error: error.message, 
                plan_b_error: fallbackError.message 
            });
        }
    }
});

app.get('/', (req, res) => {
    res.send('Server is Live with Multi-Mirror Fallback! 🚀');
});

initializeYTDlp().then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});

