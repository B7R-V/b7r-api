import axios from 'axios'

export const config = {
    maxDuration: 60
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*')

    const url = req.query?.url

    if (!url || !/^https?:\/\//i.test(url)) {
        return res.status(400).json({ error: 'Invalid URL' })
    }

    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 50000,
            maxContentLength: 100 * 1024 * 1024,
            maxRedirects: 10,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'Accept': 'video/webm,video/ogg,video/*;q=0.9,*/*;q=0.5',
                'Accept-Language': 'en-US,en;q=0.9',
                'Range': 'bytes=0-',
                'Referer': 'https://www.tiktok.com/',
                'Origin': 'https://www.tiktok.com'
            },
            validateStatus: (s) => s >= 200 && s < 400
        })

        const buffer = Buffer.from(response.data)

        res.setHeader('Content-Type', 'video/mp4')
        res.setHeader('Content-Length', buffer.length)
        res.setHeader('Cache-Control', 'no-cache')

        return res.status(200).send(buffer)
    } catch (e) {
        console.error('[STREAM]', e.response?.status, e.message)
        return res.status(e.response?.status || 500).json({
            error: e.message
        })
    }
            }
