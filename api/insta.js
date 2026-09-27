import axios from 'axios'

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

    const apis = [
        `https://api.nexoracle.com/downloader/instagram?apikey=free&url=${encodeURIComponent(url)}`,
        `https://api.betabotz.eu.org/api/download/igdowloader?url=${encodeURIComponent(url)}&apikey=beta`,
        `https://api.yanzbotz.my.id/api/downloader/instagram?url=${encodeURIComponent(url)}`
    ]

    for (const apiUrl of apis) {
        try {
            const { data } = await axios.get(apiUrl, {
                timeout: 25000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            })

            const videoUrl =
                data?.result?.video ||
                data?.result?.url ||
                data?.result?.download_url ||
                data?.data?.video ||
                data?.video ||
                data?.url ||
                data?.result?.[0]?.url ||
                data?.result?.medias?.[0]?.url ||
                null

            const thumbnail =
                data?.result?.thumbnail ||
                data?.data?.thumbnail ||
                data?.thumbnail ||
                ''

            const title =
                data?.result?.caption ||
                data?.result?.title ||
                data?.data?.title ||
                data?.title ||
                'Instagram Video'

            const uploader =
                data?.result?.username ||
                data?.result?.owner ||
                data?.data?.username ||
                ''

            if (videoUrl && typeof videoUrl === 'string' && videoUrl.startsWith('http')) {
                return res.status(200).json({
                    success: true,
                    platform: 'instagram',
                    title: String(title).slice(0, 200),
                    thumbnail,
                    video: videoUrl,
                    audio: videoUrl,
                    uploader
                })
            }
        } catch (e) {
            continue
        }
    }

    return res.status(404).json({
        success: false,
        error: 'All APIs failed. Try another Instagram URL.'
    })
}
