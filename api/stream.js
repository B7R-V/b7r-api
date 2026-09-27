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
            responseType: 'stream',
            timeout: 50000,
            maxContentLength: 100 * 1024 * 1024,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'Referer': 'https://www.tiktok.com/'
            }
        })

        res.setHeader('Content-Type', response.headers['content-type'] || 'video/mp4')
        if (response.headers['content-length']) {
            res.setHeader('Content-Length', response.headers['content-length'])
        }

        response.data.pipe(res)
    } catch (e) {
        console.error('[STREAM]', e.message)
        if (!res.headersSent) {
            res.status(500).json({ error: e.message })
        }
    }
}
