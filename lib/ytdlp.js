import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'

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

export function runYtdlp(url, options = {}) {
    return new Promise((resolve, reject) => {
        const bin = findBinary()

        if (!bin) {
            return reject(new Error('yt-dlp binary not found'))
        }

        const args = [
            '--no-warnings',
            '--no-playlist',
            '--no-check-certificate',
            '--no-call-home',
            '--no-cache-dir',
            '--socket-timeout', '15',
            '--retries', '3',
            '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            '-j',
            ...(options.extraArgs || []),
            url
        ]

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

    const result = {
        title: (info.title || info.description || 'Media').slice(0, 200),
        thumbnail: info.thumbnail || '',
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
