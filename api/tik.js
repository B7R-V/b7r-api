import axios from 'axios'

export const config = {
    maxDuration: 60
}

function match(str, ...patterns) {
    for (const p of patterns) {
        const r = str.match(p)
        if (r) return r
    }
    return null
}

function parseHtmlJson(html, scriptId) {
    const regex = new RegExp(`<script[^>]*id=["']${scriptId}["'][^>]*>([\\s\\S]*?)<\\/script>`, 'i')
    const m = html.match(regex)
    if (!m || !m[1]) return null

    try {
        return JSON.parse(m[1].trim())
    } catch {
        return null
    }
}

async function extractTikTokVideo(url) {
    if (!url || !/^https?:\/\//i.test(url)) {
        throw new Error('رابط غير صحيح')
    }

    if (!/(tiktok\.com|vt\.tiktok|vm\.tiktok)/i.test(url)) {
        throw new Error('الرابط ليس من تيك توك')
    }

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'max-age=0',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"'
    }
    let finalUrl = url
    if (/vm\.tiktok|vt\.tiktok/i.test(url)) {
        const res = await axios.get(url, {
            headers,
            timeout: 20000,
            maxRedirects: 10,
            validateStatus: (s) => s >= 200 && s < 400
        })
        finalUrl = res.request?.res?.responseUrl || url
    }

    const { data } = await axios.get(finalUrl, {
        headers,
        timeout: 30000,
        maxRedirects: 10,
        validateStatus: (s) => s >= 200 && s < 400
    })

    const html = String(data)
    const universalData = parseHtmlJson(html, '__UNIVERSAL_DATA_FOR_REHYDRATION__')

    if (universalData) {
        const scope = universalData?.__DEFAULT_SCOPE__ || {}
        const videoDetail = scope['webapp.video-detail']
        const itemStruct = videoDetail?.itemInfo?.itemStruct

        if (itemStruct) {
            const video = itemStruct.video || {}
            const videoUrl =
                video.playAddr ||
                video.downloadAddr ||
                video.bitrateInfo?.[0]?.PlayAddr?.UrlList?.[0] ||
                null

            if (videoUrl) {
                return {
                    video: videoUrl,
                    audio: videoUrl,
                    title: (itemStruct.desc || 'TikTok Video').slice(0, 200),
                    thumbnail: video.cover || video.originCover || '',
                    duration: video.duration || 0,
                    uploader: itemStruct.author?.uniqueId || '',
                    nickname: itemStruct.author?.nickname || ''
                }
            }
        }
    }
    const sdUrl = match(
        html,
        /"playAddr":"(https:[^"]+?)"/,
        /"downloadAddr":"(https:[^"]+?)"/,
        /"play_addr":\{[^}]*"url_list":\["(https:[^"]+?)"/
    )?.[1]

    const hdUrl = match(
        html,
        /"downloadAddr":"(https:[^"]+?)"/
    )?.[1]

    if (sdUrl || hdUrl) {
        return {
            video: (hdUrl || sdUrl).replace(/\\u002F/g, '/').replace(/\\\//g, '/'),
            audio: (hdUrl || sdUrl).replace(/\\u002F/g, '/').replace(/\\\//g, '/'),
            title: 'TikTok Video',
            thumbnail: '',
            duration: 0,
            uploader: ''
        }
    }
    const mp4Match = html.match(/https:\/\/[^"\\]+?\.mp4[^"\\]*/g)
    if (mp4Match && mp4Match.length) {
        const best = mp4Match.find((u) => u.includes('play')) || mp4Match[0]
        return {
            video: best.replace(/\\u002F/g, '/').replace(/\\\//g, '/'),
            audio: best.replace(/\\u002F/g, '/').replace(/\\\//g, '/'),
            title: 'TikTok Video',
            thumbnail: '',
            duration: 0,
            uploader: ''
        }
    }

    throw new Error('لم أجد رابط الفيديو. تأكد أن الفيديو عام وليس خاص.')
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
        const data = await extractTikTokVideo(url)

        return res.status(200).json({
            success: true,
            platform: 'tiktok',
            ...data
        })
    } catch (e) {
        console.error('[TIKTOK]', e.message)
        return res.status(500).json({
            success: false,
            error: e.message || 'Download failed'
        })
    }
                }
