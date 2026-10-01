import axios from 'axios'

export const config = {
    maxDuration: 60
}

function parseString(str) {
    if (!str) return ''
    try {
        return JSON.parse(`{"text": "${str}"}`).text
    } catch {
        return str
    }
}

function match(str, ...patterns) {
    for (const p of patterns) {
        const r = str.match(p)
        if (r) return r
    }
    return null
}

async function fetchFacebookVideo(url) {
    if (!url || !/^https?:\/\//i.test(url)) {
        throw new Error('رابط غير صحيح')
    }

    if (!/(facebook\.com|fb\.watch|fb\.me)/i.test(url)) {
        throw new Error('الرابط ليس من فيسبوك')
    }

    const headers = {
        'sec-fetch-user': '?1',
        'sec-ch-ua-mobile': '?0',
        'sec-fetch-site': 'none',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'cache-control': 'max-age=0',
        'upgrade-insecure-requests': '1',
        'accept-language': 'en-GB,en;q=0.9',
        'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'accept-encoding': 'gzip, deflate, br',
        'accept-charset': 'utf-8'
    }

    const { data } = await axios.get(url, {
        headers,
        timeout: 30000,
        maxRedirects: 10,
        validateStatus: (s) => s >= 200 && s < 400
    })

    const html = String(data)
        .replace(/\\"/g, '"')
        .replace(/\\u0025/g, '%')
        .replace(/\\\//g, '/')
        .replace(/&amp;/g, '&')

    const sdUrl = match(
        html,
        /"browser_native_sd_url":"(.*?)"/,
        /sd_src\s*:\s*"([^"]*)"/,
        /"playable_url":"(.*?)"/
    )?.[1]

    const hdUrl = match(
        html,
        /"browser_native_hd_url":"(.*?)"/,
        /hd_src\s*:\s*"([^"]*)"/,
        /"playable_url_quality_hd":"(.*?)"/
    )?.[1]

    const title = match(
        html,
        /<meta\s+name="description"\s+content="(.*?)"/,
        /<meta\s+property="og:description"\s+content="(.*?)"/,
        /<title>(.*?)<\/title>/
    )?.[1] || 'Facebook Video'

    const thumbnail = match(
        html,
        /<meta\s+property="og:image"\s+content="(.*?)"/
    )?.[1] || ''

    const duration = match(
        html,
        /"video_duration":(\d+)/,
        /"duration":(\d+)/
    )?.[1]

    if (!sdUrl && !hdUrl) {
        throw new Error('لم أجد الفيديو. تأكد إنه عام وليس خاص.')
    }

    return {
        video: parseString(hdUrl || sdUrl),
        audio: parseString(hdUrl || sdUrl),
        title: parseString(title).slice(0, 200),
        thumbnail: parseString(thumbnail),
        duration: duration ? Number(duration) : 0,
        quality: hdUrl ? 'HD' : 'SD'
    }
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

    try {
        const data = await fetchFacebookVideo(url)

        return res.status(200).json({
            success: true,
            platform: 'facebook',
            ...data
        })
    } catch (e) {
        console.error('[FACEBOOK]', e.message)
        return res.status(500).json({
            success: false,
            error: e.message || 'Download failed'
        })
    }
}
