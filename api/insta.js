import instagramGetUrl from 'instagram-url-direct'

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
        const result = await instagramGetUrl(url)

        if (!result || !result.url_list || !result.url_list.length) {
            return res.status(404).json({
                success: false,
                error: 'No media found in this post'
            })
        }

        // أول رابط فيديو
        const videoUrl = result.url_list.find(u => u.includes('.mp4')) || result.url_list[0]

        return res.status(200).json({
            success: true,
            platform: 'instagram',
            title: 'Instagram Video',
            thumbnail: result.poster || '',
            video: videoUrl,
            audio: videoUrl,
            uploader: '',
            count: result.url_list.length,
            all: result.url_list
        })
    } catch (e) {
        console.error('[INSTAGRAM]', e.message)
        return res.status(500).json({
            success: false,
            error: e.message || 'Download failed'
        })
    }
}
