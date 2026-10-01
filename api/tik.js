import axios from 'axios'

export const config = {
    maxDuration: 60
}

function buildUrl(pathOrUrl) {
    if (!pathOrUrl) return null

    let s = String(pathOrUrl).trim()

    // رابط كامل
    if (/^https?:\/\//i.test(s)) return s

    // رابط ناقص النقطتين (مشكلة tikwm)
    if (/^https?\/\//i.test(s)) {
        return s.replace(/^(https?)(\/\/)/i, '$1://')
    }

    // مسار نسبي
    const clean = s.startsWith('/') ? s : '/' + s
    return `https://www.tikwm.com${clean}`
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', 'application/json; charset=utf-8')

    const url = req.query?.url || req.body?.url

    if (!url || typeof url !== 'string') {
        return res.status(400).json({
            success: false,
            error: 'Missing url parameter'
        })
    }

    if (!/^https?:\/\//i.test(url)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid URL'
        })
    }

    try {
        const { data } = await axios.get('https://www.tikwm.com/api/', {
            params: { url, hd: 1 },
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        })

        if (!data || data.code !== 0 || !data.data) {
            return res.status(404).json({
                success: false,
                error: data?.msg || 'No video found'
            })
        }

        const video = data.data

        const videoUrl = buildUrl(video.hdplay || video.play)
        const audioUrl = buildUrl(video.music) || videoUrl
        const thumbUrl = buildUrl(video.cover)

        if (!videoUrl) {
            return res.status(404).json({
                success: false,
                error: 'Could not build video URL'
            })
        }

        return res.status(200).json({
            success: true,
            platform: 'tiktok',
            title: (video.title || 'TikTok Video').slice(0, 200),
            thumbnail: thumbUrl || '',
            duration: video.duration || 0,
            uploader: video.author?.unique_id || '',
            video: videoUrl,
            audio: audioUrl
        })
    } catch (e) {
        console.error('[TIKTOK]', e.message)
        return res.status(500).json({
            success: false,
            error: e.message || 'Download failed'
        })
    }
            }
