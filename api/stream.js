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
        const upstream = await axios.get(url, {
            responseType: 'stream',
            timeout: 45000,
            maxRedirects: 10,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://www.tiktok.com/',
                'Origin': 'https://www.tiktok.com',
                'Accept-Encoding': 'identity',
                'Range': req.headers.range || 'bytes=0-'
            },
            validateStatus: (s) => s >= 200 && s < 400
        })

        res.setHeader(
            'Content-Type',
            upstream.headers['content-type'] || 'video/mp4'
        )

        const cl = upstream.headers['content-length']
        if (cl) res.setHeader('Content-Length', cl)

        res.setHeader('Cache-Control', 'no-cache')

        upstream.data.pipe(res)
    } catch (e) {
        console.error('[STREAM]', e.message)
        if (!res.headersSent) {
            res.status(500).json({ error: e.message })
        }
    }
            }
