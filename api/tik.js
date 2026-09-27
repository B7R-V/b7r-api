import axios from 'axios'

export const config = {
    maxDuration: 60
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', 'application/json; charset=utf-8')

    const url = req.query?.url || req.body?.url

    if (!url || typeof url !== 'string') {
        return res.status(400).json({ success: false, error: 'Missing url parameter' })
    }

    if (!/^https?:\/\//i.test(url)) {
        return res.status(400).json({ success: false, error: 'Invalid URL format' })
    }

    try {
        const { data } = await axios.post(
            'https://api.cobalt.tools/api/json',
            {
                url: url,
                vQuality: '720',
                isAudioOnly: false
            },
            {
                timeout: 45000,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            }
        )

        if (!data || !data.url) {
            return res.status(404).json({
                success: false,
                error: data?.text || 'No video found'
            })
        }

        return res.status(200).json({
            success: true,
            platform: 'tiktok',
            title: 'TikTok Video',
            thumbnail: '',
            duration: 0,
            uploader: '',
            video: data.url,
            audio: data.url
        })
    } catch (e) {
        return res.status(500).json({
            success: false,
            error: e.response?.data?.text || e.message || 'Download failed'
        })
    }
            }
