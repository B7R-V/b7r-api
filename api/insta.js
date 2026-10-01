import axios from 'axios'

export const config = {
    maxDuration: 60
}

function extractShortcode(url) {
    const m = url.match(/\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/)
    return m ? m[2] : null
}

function match(str, ...patterns) {
    for (const p of patterns) {
        const r = str.match(p)
        if (r) return r
    }
    return null
}

async function fetchFromEmbed(shortcode) {
    const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Fetch-Dest': 'iframe',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'cross-site',
        'Referer': 'https://www.instagram.com/'
    }

    const { data } = await axios.get(embedUrl, {
        headers,
        timeout: 25000,
        validateStatus: (s) => s >= 200 && s < 400
    })

    const html = String(data)

    // ابحث عن video_url في الـ JSON
    const videoUrl = match(
        html,
        /"video_url":"(https:[^"]+?)"/,
        /video_url\\?":\\?"(https:[^"\\]+)/,
        /"contentUrl":"(https:[^"]+?)"/
    )?.[1]

    const thumb = match(
        html,
        /"display_url":"(https:[^"]+?)"/,
        /"thumbnail_url":"(https:[^"]+?)"/,
        /property="og:image"\s+content="(https:[^"]+?)"/
    )?.[1]

    const caption = match(
        html,
        /"caption":"(.*?)"/,
        /class="Caption"[\s\S]*?>([^<]{1,300})</,
        /property="og:title"\s+content="([^"]+)"/
    )?.[1]

    const author = match(
        html,
        /"username":"([^"]+?)"/,
        /class="UsernameText">([^<]+)</
    )?.[1]

    return {
        video: videoUrl ? videoUrl.replace(/\\u0026/g, '&').replace(/\\\//g, '/') : null,
        thumbnail: thumb ? thumb.replace(/\\u0026/g, '&').replace(/\\\//g, '/') : '',
        title: caption ? caption.replace(/\\u0026/g, '&').replace(/\\u002F/g, '/').slice(0, 200) : 'Instagram Video',
        uploader: author || ''
    }
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', 'application/json; charset=utf-8')

    const url = req.query?.url || req.body?.url

    if (!url || typeof url !== 'string') {
        return res.status(400).json({ success: false, error: 'Missing url' })
    }

    if (!/^https?:\/\//i.test(url)) {
        return res.status(400).json({ success: false, error: 'Invalid URL' })
    }

    const shortcode = extractShortcode(url)

    if (!shortcode) {
        return res.status(400).json({ success: false, error: 'Invalid Instagram URL' })
    }

    try {
        const data = await fetchFromEmbed(shortcode)

        if (!data.video) {
            return res.status(404).json({
                success: false,
                error: 'No video found in embed. Try another post.'
            })
        }

        return res.status(200).json({
            success: true,
            platform: 'instagram',
            title: data.title,
            thumbnail: data.thumbnail,
            video: data.video,
            audio: data.video,
            uploader: data.uploader
        })
    } catch (e) {
        console.error('[INSTAGRAM]', e.message)
        return res.status(500).json({
            success: false,
            error: e.message || 'Download failed'
        })
    }
}
