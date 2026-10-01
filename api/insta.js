import { snapsave } from 'snapsave-media-downloader'

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
            error: 'Missing url parameter'
        })
    }

    if (!/^https?:\/\//i.test(url)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid URL'
        })
    }

    if (!/(instagram\.com|instagr\.am)/i.test(url)) {
        return res.status(400).json({
            success: false,
            error: 'Not an Instagram URL'
        })
    }

    try {
        const result = await snapsave(url)

        if (!result || !result.success || !result.data || !result.data.media || !result.data.media.length) {
            return res.status(404).json({
                success: false,
                error: result?.message || 'No media found in this post'
            })
        }

        const media = result.data.media
        const video = media.find(m => m.type === 'video') || media[0]

        return res.status(200).json({
            success: true,
            platform: 'instagram',
            title: result.data.description || result.data.title || 'Instagram Video',
            thumbnail: result.data.preview || video.thumbnail || '',
            video: video.url,
            audio: video.url,
            uploader: '',
            count: media.length,
            all: media.map(m => m.url)
        })
    } catch (e) {
        console.error('[INSTAGRAM]', e.message)
        return res.status(500).json({
            success: false,
            error: e.message || 'Download failed'
        })
    }
        }
