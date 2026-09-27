import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import os from 'os'

function findBinary() {
    const candidates = [
        path.join(process.cwd(), 'bin', 'yt-dlp'),
        '/var/task/bin/yt-dlp',
        '/tmp/yt-dlp',
        '/data/data/com.termux/files/usr/bin/yt-dlp',
        'yt-dlp'
    ]

    for (const p of candidates) {
        try {
            if (p === 'yt-dlp') return p
            if (fs.existsSync(p)) {
                const size = fs.statSync(p).size
                if (size > 100000) return p
            }
        } catch {}
    }
    return null
}

function getCookieFileForUrl(url) {
    const isInstagram = /instagram\.com/i.test(url)
    const cookieName = isInstagram ? 'cookies_ig.txt' : 'cookies.txt'

    const candidates = [
        path.join(process.cwd(), cookieName),
        path.join('/var/task', cookieName),
        path.join(process.cwd(), '..', cookieName)
    ]

    for (const p of candidates) {
        try {
            if (fs.existsSync(p)) return p
        } catch {}
    }
    return null
}

function copyCookiesToTemp(source, tag) {
    if (!source) return null
    try {
        const tempPath = path.join(os.tmpdir(), `cookies-${tag}.txt`)
        const content = fs.readFileSync(source, 'utf-8')
        fs.writeFileSync(tempPath, content)
        return tempPath
    } catch (e) {
        return source
    }
}

export function runYtdlp(url, options = {}) {
    return new Promise((resolve, reject) => {
        const bin = findBinary()
        if (!bin) return reject(new Error('yt-dlp binary not found'))

        const isInstagram = /instagram\.com/i.test(url)

        const args = [
            '--js-runtimes', 'node',
            '--remote-components', 'ejs:github',
            '--cache-dir', '/tmp/yt-dlp-cache',
            '--no-warnings',
            '--no-playlist',
            '--no-check-certificate',
            '--no-call-home',
            '--socket-timeout', '20',
            '--retries', '3'
        ]

        if (isInstagram) {
            args.push('--user-agent', 'Instagram 219.0.0.12.117 Android')
            args.push('--add-header', 'X-IG-App-ID:936619743392459')
            args.push('--add-header', 'X-Requested-With:XMLHttpRequest')
            args.push('--add-header', 'Accept:*/*')
            args.push('--extractor-args', 'instagram:player_client=web')
        } else {
            args.push('--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
        }

        if (options.useCookies) {
            const source = getCookieFileForUrl(url)
            if (source) {
                const tag = isInstagram ? 'ig' : 'yt'
                const cookieFile = copyCookiesToTemp(source, tag)
                if (cookieFile) args.push('--cookies', cookieFile)
            }
        }

        if (options.extractorArgs) {
            args.push('--extractor-args', options.extractorArgs)
        }

        args.push('-j')
        args.push(...(options.extraArgs || []))
        args.push(url)

        const proc = spawn(bin, args)

        let stdout = ''
        let stderr = ''
        let killed = false

        const timer = setTimeout(() => {
            killed = true
            try { proc.kill('SIGKILL') } catch {}
            reject(new Error('Timeout: yt-dlp took too long'))
        }, options.timeout || 45000)

        proc.stdout.on('data', (d) => { stdout += d.toString() })
        proc.stderr.on('data', (d) => { stderr += d.toString() })

        proc.on('close', (code) => {
            clearTimeout(timer)
            if (killed) return

            if (code !== 0) {
                const lines = stderr.trim().split('\n').filter(Boolean)
                const errMsg = lines.slice(-2).join(' | ') || 'yt-dlp failed'
                return reject(new Error(errMsg))
            }

            try {
                const firstLine = stdout.trim().split('\n')[0]
                const json = JSON.parse(firstLine)
                resolve(json)
            } catch (e) {
                reject(new Error('Invalid JSON from yt-dlp'))
            }
        })

        proc.on('error', (err) => {
            clearTimeout(timer)
            if (killed) return
            reject(err)
        })
    })
}

export function extractInfo(info) {
    const formats = info.formats || []

    const thumbnail =
        info.thumbnail ||
        info.thumbnail_url ||
        info.thumbnails?.[info.thumbnails.length - 1]?.url ||
        info.thumbnails?.[0]?.url ||
        ''

    const result = {
        title: (info.title || info.description || 'Media').slice(0, 200),
        thumbnail,
        duration: info.duration || 0,
        uploader: info.uploader || info.channel || '',
        video: null,
        audio: null
    }

    const combined = formats
        .filter(f => f.url && f.vcodec && f.vcodec !== 'none' && f.acodec && f.acodec !== 'none')
        .sort((a, b) => (b.height || 0) - (a.height || 0))

    if (combined.length) {
        const mp4 = combined.find(f => f.ext === 'mp4')
        result.video = (mp4 || combined[0]).url
    }

    if (!result.video) {
        const videoOnly = formats
            .filter(f => f.url && f.vcodec && f.vcodec !== 'none')
            .sort((a, b) => (b.height || 0) - (a.height || 0))
        if (videoOnly.length) result.video = videoOnly[0].url
    }

    const audioOnly = formats
        .filter(f => f.url && (!f.vcodec || f.vcodec === 'none') && f.acodec && f.acodec !== 'none')
        .sort((a, b) => (b.abr || 0) - (a.abr || 0))

    if (audioOnly.length) result.audio = audioOnly[0].url

    if (!result.video && info.url) result.video = info.url
    if (!result.audio && result.video) result.audio = result.video

    return result
        }
