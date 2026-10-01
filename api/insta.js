import axios from 'axios'
import fs from 'fs'
import path from 'path'

export const config = {
    maxDuration: 60
}

function findCookiesFile() {
    const candidates = [
        path.join(process.cwd(), 'cookies_ig.txt'),
        '/var/task/cookies_ig.txt',
        path.join(process.cwd(), '..', 'cookies_ig.txt')
    ]
    for (const p of candidates) {
        try {
            if (fs.existsSync(p)) return p
        } catch {}
    }
    return null
}

function parseCookies(content) {
    // Netscape format → header string
    const lines = String(content).split('\n')
    const pairs = []
    for (const line of lines) {
        if (!line || line.startsWith('#')) continue
        const parts = line.split('\t')
        if (parts.length >= 7) {
            const [, , , , , name, value] = parts
            pairs.push(`${name}=${value}`)
        }
    }
    return pairs.join('; ')
}

function match(str, ...patterns) {
    for (const p of patterns) {
        const r = str.match(p)
        if (r) return r
    }
    return null
}

async function fetchInstagramVideo(url) {
    const cookieFile = findCookiesFile()
    let cookieHeader = ''

    if (cookieFile) {
        try {
            const content = fs.readFileSync(cookieFile, 'utf8')
            cookieHeader = parseCookies(content)
        } catch (e) {
            console.error('[IG] cookie read error:', e.message)
        }
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
        'sec-ch-ua-platform': '"Windows"',
        'Referer': 'https://www.instagram.com/'
    }

    if (cookieHeader) {
        headers['Cookie'] = cookieHeader
    }

    const { data } = await axios.get(url, {
        headers,
        timeout: 30000,
        maxRedirects: 10,
        validateStatus: (s) => s >= 200 && s < 400
    })

    const html = String(data)

    // ═══ المسار 1: video_versions من JSON ═══
    const videoVersionsMatch = html.match(/"video_versions":\s*(\[[^\]]*\])/)

    if (videoVersionsMatch) {
        try {
            const versions = JSON.parse(videoVersionsMatch[1])
            if (Array.isArray(versions) && versions.length) {
                const best = versions[0]
                return {
                    video: best.url,
                    thumbnail: best.image?.url || ''
                }
            }
        } catch {}
    }

    // ═══ المسار 2: og:video ═══
    const ogVideo = match(
        html,
        /property="og:video"\s+content="(.*?)"/,
        /property="og:video:secure_url"\s+content="(.*?)"/
    )?.[1]

    // ═══ المسار 3: video_url regex ═══
    const videoUrl = match(
        html,
        /"video_url":"(https:[^"]+?)"/,
        /"contentUrl":"(https:[^"]+?)"/
    )?.[1]

    const finalVideo = ogVideo || videoUrl

    if (!finalVideo) {
        return null
    }

    const decoded = finalVideo
        .replace(/\\u0026/g, '&')
        .replace(/\\\//g, '/')
        .replace(/&amp;/g, '&')

    const thumb = match(
        html,
        /property="og:image"\s+content="(.*?)"/,
        /"display_url":"(https:[^"]+?)"/
    )?.[1]

    const title = match(
        html,
        /property="og:title"\s+content="(.*?)"/,
        /property="og:description"\s+content="(.*?)"/
    )?.[1] || 'Instagram Video'

    const author = match(
        html,
        /property="og:title"\s+content="(.*?)\s+on\s+Instagram/,
        /"username":"([^"]+?)"/
    )?.[1] || ''

    return {
        video: decoded,
        thumbnail: thumb ? thumb.replace(/&amp;/g, '&') : '',
        title: title.replace(/&amp;/g, '&').slice(0, 200),
        uploader: author
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

    if (!/(instagram\.com|instagr\.am)/i.test(url)) {
        return res.status(400).json({ success: false, error: 'Not an Instagram URL' })
    }

    try {
        const data = await fetchInstagramVideo(url)

        if (!data || !data.video) {
            return res.status(404).json({
                success: false,
                error: 'No video found. Post may be private or a photo.'
            })
        }

        return res.status(200).json({
            success: true,
            platform: 'instagram',
            title: data.title || 'Instagram Video',
            thumbnail: data.thumbnail || '',
            video: data.video,
            audio: data.video,
            uploader: data.uploader || '',
            duration: 0
        })
    } catch (e) {
        console.error('[INSTAGRAM]', e.message)
        return res.status(500).json({
            success: false,
            error: e.message || 'Download failed'
        })
    }
}
