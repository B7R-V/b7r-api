import axios from 'axios'

export const config = {
    maxDuration: 60
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

async function getTweetInfo(url) {
    const cleanUrl = url.replace(/(?:x\.com|twitter\.com)/i, 'twitter.com')

    const headers = {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br'
    }

    const { data: html } = await axios.get(cleanUrl, {
        headers,
        timeout: 30000,
        maxRedirects: 10,
        validateStatus: (s) => s >= 200 && s < 400
    })

    const text = String(html)
    const variants = []

    // استخراج variants من JSON
    const variantRegex = /"variants":\s*\[([^\]]+)\]/g
    let m

    while ((m = variantRegex.exec(text)) !== null) {
        const block = m[1]
        const urlRegex = /"url":"([^"]+\.mp4[^"]*)"/g
        let u

        while ((u = urlRegex.exec(block)) !== null) {
            const videoUrl = u[1]
                .replace(/\\u002F/g, '/')
                .replace(/\\\//g, '/')
                .replace(/\\/g, '')

            const bitrateMatch = block.match(/"bitrate":(\d+)/)
            variants.push({
                url: videoUrl,
                bitrate: bitrateMatch ? Number(bitrateMatch[1]) : 0
            })
        }
    }

    // بديل: مباشر من video.twimg.com
    if (!variants.length) {
        const directMatch = text.match(/https:\/\/video\.twimg\.com\/[^"'\s\\]+\.mp4[^"'\s\\]*/g)
        if (directMatch) {
            directMatch.forEach((v) => {
                const cleaned = v.replace(/\\u002F/g, '/').replace(/\\\//g, '/')
                variants.push({ url: cleaned, bitrate: 0 })
            })
        }
    }

    if (!variants.length) {
        throw new Error('مفيش فيديو في التغريدة — ممكن تكون صورة أو نص')
    }

    // أعلى جودة
    variants.sort((a, b) => b.bitrate - a.bitrate)
    const best = variants[0]

    const titleMatch =
        text.match(/<meta\s+property="og:description"\s+content="([^"]+)"/) ||
        text.match(/<meta\s+name="description"\s+content="([^"]+)"/)

    const thumbMatch = text.match(/<meta\s+property="og:image"\s+content="([^"]+)"/)

    return {
        video: best.url,
        audio: best.url,
        title: (titleMatch?.[1] || 'Twitter Video')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .slice(0, 200),
        thumbnail: thumbMatch?.[1] || '',
        count: variants.length
    }
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
            error: 'Invalid URL format'
        })
    }

    if (!/(twitter\.com|x\.com)/i.test(url)) {
        return res.status(400).json({
            success: false,
            error: 'Not a Twitter/X URL'
        })
    }

    try {
        const data = await getTweetInfo(url)

        return res.status(200).json({
            success: true,
            platform: 'twitter',
            title: data.title,
            thumbnail: data.thumbnail,
            video: data.video,
            audio: data.audio,
            duration: 0,
            uploader: ''
        })
    } catch (e) {
        console.error('[TWITTER]', e.message)
        return res.status(500).json({
            success: false,
            error: e.message || 'Download failed'
        })
    }
}
}
