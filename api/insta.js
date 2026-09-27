import { snapsave } from 'snapsave-media-downloader'

export const config = { maxDuration: 60 }

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', 'application/json; charset=utf-8')

    const url = req.query?.url || req.body?.url

    if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
        return res.status(400).json({ success: false, error: 'Invalid or missing URL parameter' })
    }

    try {
        const result = await snapsave(url)

        if (!result || !result.success || !result.data || !result.data.media || result.data.media.length === 0) {
            return res.status(404).json({ success: false, error: 'No downloadable media found or API failed.' })
        }

        const media = result.data.media[0]
        if (media.type !== 'video') {
            return res.status(404).json({ success: false, error: 'The provided URL does not contain a video.' })
        }

        return res.status(200).json({
            success: true,
            platform: 'instagram',
            title: result.data.description || 'Instagram Video',
            thumbnail: media.thumbnail || '',
            video: media.url,
            audio: media.url,
            uploader: result.data.author || '' 
        })

    } catch (e) {
        return res.status(500).json({ success: false, error: e.message || 'An unknown error occurred.' })
    }
}
