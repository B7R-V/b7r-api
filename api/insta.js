// api/insta.js
import axios from 'axios'

export const config = {
    maxDuration: 60
}

const API_BASE = 'https://api.savefromins.com/api/contentsite_api'
const DOMAIN_VIDEO = 'api-ak.savefromins.com'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36'

let SFI_SESSION = {
    auth: null,
    domain: DOMAIN_VIDEO,
    lastFetch: 0
}

async function fetchAuth() {
    if (SFI_SESSION.auth && Date.now() - SFI_SESSION.lastFetch < 6 * 60 * 60 * 1000) {
        return SFI_SESSION.auth
    }

    try {
        const r = await axios.get('https://savefromins.com/ar', {
            headers: { 'User-Agent': UA },
            timeout: 20000
        })
        const html = String(r.data)
        const scripts = [...html.matchAll(/<script[^>]*src=["']([^"']+)["']/g)].map(m => m[1])

        for (const s of scripts) {
            if (!s.includes('_next')) continue
            try {
                const fullUrl = s.startsWith('http') ? s : 'https://savefromins.com' + s
                const rs = await axios.get(fullUrl, {
                    headers: { 'User-Agent': UA },
                    timeout: 15000
                })
                const js = String(rs.data)

                const match =
                    js.match(/auth\s*:\s*["']([^"']+)["']/) ||
                    js.match(/["'](20\d{2}\d{4}[a-z0-9]{5,})["']/) ||
                    js.match(/["']([a-z]{4,}[0-9]{6,})["']/i)

                if (match) {
                    SFI_SESSION.auth = match[1] || match[0]
                    SFI_SESSION.lastFetch = Date.now()
                    console.log('[SFI] Auth:', SFI_SESSION.auth)
                    return SFI_SESSION.auth
                }
            } catch (e) {}
        }
    } catch (e) {
        console.error('[SFI] fetchAuth failed:', e.message)
    }

    throw new Error('فشل جلب التوكن — savefromins غيّر الـ API')
}

async function parseInstagram(url) {
    const auth = await fetchAuth()
    const params = new URLSearchParams({
        auth,
        domain: DOMAIN_VIDEO,
        origin: 'source',
        link: url
    })

    const r = await axios.post(`${API_BASE}/media/parse`, params.toString(), {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': UA,
            'Origin': 'https://savefromins.com',
            'Referer': 'https://savefromins.com/'
        },
        timeout: 30000
    })

    const data = r.data?.data
    if (!data) throw new Error('فشل تحليل الرابط')

    return {
        title: data.title || 'Instagram Media',
        thumbnail: data.thumbnail || '',
        duration: data.duration || 0,
        resources: data.resources || []
    }
}

async function getDownloadLink(resource) {
    if (resource.download_url && resource.download_url.startsWith('http')) {
        return resource.download_url
    }

    const auth = await fetchAuth()
    const params = new URLSearchParams({
        auth,
        domain: DOMAIN_VIDEO,
        request: resource.resource_content
    })

    const r = await axios.post(`${API_BASE}/media/download`, params.toString(), {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': UA,
            'Origin': 'https://savefromins.com',
            'Referer': 'https://savefromins.com/'
        },
        timeout: 30000
    })

    const taskId = r.data?.data?.task_id
    if (!taskId) {
        const directLink = r.data?.data?.download_link
        if (directLink) return directLink
        throw new Error('فشل بدء التحميل')
    }

    const sseUrl = `https://api.savefromins.com/sse/contentsite_api/media/download_query?task_id=${encodeURIComponent(taskId)}&download_domain=${DOMAIN_VIDEO}&origin=content_site`

    return await new Promise((resolve, reject) => {
        let resolved = false
        let fullText = ''

        const timeout = setTimeout(() => {
            if (!resolved) {
                resolved = true
                reject(new Error('انتهت مدة الانتظار'))
            }
        }, 55000)

        axios.get(sseUrl, {
            headers: {
                'Accept': 'text/event-stream',
                'User-Agent': UA,
                'Referer': 'https://savefromins.com/',
                'Cache-Control': 'no-cache'
            },
            responseType: 'stream',
            timeout: 60000
        }).then(response => {
            response.data.on('data', chunk => {
                if (resolved) return
                fullText += chunk.toString()

                const match =
                    fullText.match(/"download_link"\s*:\s*"([^"]+)"/) ||
                    fullText.match(/"download_link"\s*:\s*"(https?:\\\/\\\/[^"]+)"/)

                if (match) {
                    resolved = true
                    clearTimeout(timeout)
                    response.data.destroy()
                    let link = match[1].replace(/\\\//g, '/').replace(/\\u002F/g, '/')
                    resolve(link)
                    return
                }

                if (fullText.includes('"status":"failed"')) {
                    resolved = true
                    clearTimeout(timeout)
                    response.data.destroy()
                    reject(new Error('فشل التحميل على السيرفر'))
                }
            }).on('end', () => {
                if (resolved) return
                resolved = true
                clearTimeout(timeout)

                const match = fullText.match(/"download_link"\s*:\s*"([^"]+)"/)
                if (match) {
                    let link = match[1].replace(/\\\//g, '/').replace(/\\u002F/g, '/')
                    resolve(link)
                } else {
                    reject(new Error('لم يتم العثور على رابط التحميل'))
                }
            }).on('error', (e) => {
                if (resolved) return
                resolved = true
                clearTimeout(timeout)
                reject(new Error('خطأ اتصال: ' + e.message))
            })
        }).catch(e => {
            if (resolved) return
            resolved = true
            clearTimeout(timeout)
            reject(new Error('فشل SSE: ' + e.message))
        })
    })
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
        return res.status(400).json({ success: false, error: 'Not Instagram URL' })
    }

    const cleanUrl = url.split('?')[0]

    try {
        const parsed = await parseInstagram(cleanUrl)

        if (!parsed.resources.length) {
            return res.status(404).json({ success: false, error: 'No media found' })
        }

        const videos = parsed.resources.filter(r => r.type === 'video')
        const audios = parsed.resources.filter(r => r.type === 'audio')
        const images = parsed.resources.filter(r => {
            if (r.type === 'video' || r.type === 'audio') return false
            if (r.type === 'picture' || r.type === 'image' || r.type === 'photo') return true
            if (r.format && ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic'].includes(String(r.format).toLowerCase())) return true
            return false
        })

        const result = {
            success: true,
            platform: 'instagram',
            title: parsed.title,
            thumbnail: parsed.thumbnail,
            duration: parsed.duration,
            video: null,
            audio: null,
            images: []
        }

        if (videos.length) {
            try {
                result.video = await getDownloadLink(videos[0])
                result.audio = result.video
            } catch (e) {
                console.error('[video link]', e.message)
            }
        }

        if (!result.video && images.length) {
            for (const img of images.slice(0, 10)) {
                try {
                    const link = await getDownloadLink(img)
                    result.images.push(link)
                } catch (e) {}
            }
        }

        if (!result.video && !result.images.length && audios.length) {
            try {
                result.audio = await getDownloadLink(audios[0])
            } catch (e) {}
        }

        if (!result.video && !result.audio && !result.images.length) {
            return res.status(404).json({
                success: false,
                error: 'Could not get download link'
            })
        }

        return res.status(200).json(result)
    } catch (e) {
        console.error('[INSTAGRAM]', e.message)
        return res.status(500).json({
            success: false,
            error: e.message || 'Download failed'
        })
    }
                    }
