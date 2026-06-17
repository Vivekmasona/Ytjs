const express = require('express');
const fs = require('fs');
const path = require('path');
const YTDlpWrap = require('yt-dlp-wrap').default;

const app = express();
const PORT = process.env.PORT || 3000;

// Binary file ka path set kar rahe hain jo project folder ke andar hi save hogi
const binaryPath = path.join(__dirname, 'yt-dlp');
let ytDlpWrap;

// Ek function banayein jo check karega ki binary hai ya nahi, aur nahi hai toh download karega
async function initializeYTDlp() {
    if (!fs.existsSync(binaryPath)) {
        console.log('yt-dlp binary nahi mili. GitHub se download ho rahi hai...');
        try {
            // Yeh function GitHub se automatic latest yt-dlp binary download kar lega
            await YTDlpWrap.downloadFromGithub(binaryPath);
            console.log('yt-dlp download complete ho gaya!');
            
            // Linux/Render servers par execution permission dena zaroori hai
            if (process.platform !== 'win32') {
                fs.chmodSync(binaryPath, '755');
            }
        } catch (err) {
            console.error('yt-dlp download karne me error aayi:', err);
            process.exit(1); // Server ko stop kar do agar core tool download na ho sake
        }
    }
    
    // Download hone ke baad wrapper ko sahi path pass karein
    ytDlpWrap = new YTDlpWrap(binaryPath);
}

// API Route
app.get('/get-audio', async (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).json({ error: 'URL is required' });

    if (!ytDlpWrap) {
        return res.status(503).json({ error: 'Server is initializing yt-dlp, please try again in a few seconds.' });
    }

    try {
        let audioUrl = await ytDlpWrap.execPromise([
            videoUrl,
            '-f', 'ba', // Best audio format
            '-g'        // Direct URL stream link link nikalne ke liye
        ]);

        res.json({ audio_url: audioUrl.trim() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Pehle yt-dlp check/download hoga, uske baad hi server start hoga
initializeYTDlp().then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
