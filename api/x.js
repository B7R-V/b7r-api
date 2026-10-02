export const config = {
    maxDuration: 60
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', 'application/json; charset=utf-8')

    const url = req.query?.url

    if (!url) {
        return res.status(400).json({
            success: false,
            error: 'Missing url'
        })
    }

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
            }
        })

        const html = await response.text()

        return res.status(200).json({
            success: true,
            status: response.status,
            htmlLength: html.length,
            hasVariants: html.includes('variants'),
            hasTwimg: html.includes('video.twimg.com'),
            preview: html.slice(0, 300)
        })
    } catch (e) {
        return res.status(500).json({
            success: false,
            error: e.message,
            stack: (e.stack || '').split('\n').slice(0, 5)
        })
    }
}
