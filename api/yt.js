import { runYtdlp, extractInfo } from '../lib/ytdlp.js'

export const config = {
    maxDuration: 60
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', 'application/json; charset=utf-8')

    const url = req.query?.url || req.body?.url
    const quality = req.query?.quality || 'best'

    if (!url || typeof url !== 'string') {
        return res.status(400).json({
            success: false,
            error: 'Missing or invalid url parameter'
        })
    }

    if (!/^https?:\/\//i.test(url)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid URL format'
        })
    }

    let formatArg = 'bestvideo*[height<=720]+bestaudio/best[height<=720]/bestvideo+bestaudio/best'

    if (quality === 'audio') {
        formatArg = 'bestaudio[ext=m4a]/bestaudio/best'
    } else if (['360', '480', '720', '1080', '1440', '2160'].includes(String(quality))) {
        formatArg = `bestvideo*[height<=${quality}]+bestaudio/best[height<=${quality}]/bestvideo+bestaudio/best`
    }

    try {
        const info = await runYtdlp(url, {
            timeout: 50000,
            cookiesEnv: 'YOUTUBE_COOKIES',
            extractorArgs: 'youtube:player_client=android,ios,web',
            extraArgs: ['-f', formatArg]
        })
        const data = extractInfo(info)

        if (!data.video) {
            return res.status(404).json({
                success: false,
                error: 'No downloadable video found'
            })
        }

        return res.status(200).json({
            success: true,
            platform: 'youtube',
            quality: quality,
            ...data
        })
    } catch (e) {
        return res.status(500).json({
            success: false,
            error: e.message || 'Download failed'
        })
    }
}
