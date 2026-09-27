import { igdl } from 'ultra-igdl'

export const config = { maxDuration: 60 }

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', 'application/json; charset=utf-8')

    const url = req.query?.url || req.body?.url

    if (!url || !/^https?:\/\//i.test(url)) {
        return res.status(400).json({ success: false, error: 'Invalid URL' })
    }

    try {
        const result = await igdl(url)

        if (!result || !result.url) {
            return res.status(404).json({ success: false, error: 'No downloadable video found' })
        }

        return res.status(200).json({
            success: true,
            platform: 'instagram',
            title: result.caption || 'Instagram Video',
            thumbnail: result.thumbnail || '',
            video: result.url,
            audio: result.url,
            uploader: result.owner || ''
        })
    } catch (e) {
        return res.status(500).json({ success: false, error: e.message })
    }
        }
