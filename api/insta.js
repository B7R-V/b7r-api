import { runYtdlp, extractInfo } from '../lib/ytdlp.js'

export const config = {
    maxDuration: 60
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', 'application/json; charset=utf-8')

    const url = req.query?.url || req.body?.url

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

    try {
        const info = await runYtdlp(url, {
            timeout: 45000,
            useCookies: true
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
            platform: 'instagram',
            ...data
        })
    } catch (e) {
        return res.status(500).json({
            success: false,
            error: e.message || 'Download failed'
        })
    }
                }
