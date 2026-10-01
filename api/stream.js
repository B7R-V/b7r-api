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
        const upstream = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://www.tiktok.com/',
                'Origin': 'https://www.tiktok.com',
                'Range': req.headers.range || 'bytes=0-'
            },
            redirect: 'follow'
        })

        if (!upstream.ok) {
            return res.status(upstream.status).json({
                error: `Upstream ${upstream.status}`
            })
        }

        res.setHeader(
            'Content-Type',
            upstream.headers.get('content-type') || 'video/mp4'
        )

        const cl = upstream.headers.get('content-length')
        if (cl) res.setHeader('Content-Length', cl)

        res.setHeader('Cache-Control', 'no-cache')

        const reader = upstream.body.getReader()

        while (true) {
            const { done, value } = await reader.read()
            if (done) break
            res.write(Buffer.from(value))
        }

        res.end()
    } catch (e) {
        console.error('[STREAM]', e.message)
        if (!res.headersSent) {
            res.status(500).json({ error: e.message })
        }
    }
}
