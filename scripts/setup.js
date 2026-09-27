import fs from 'fs'
import https from 'https'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const binDir = path.join(__dirname, '..', 'bin')
const binPath = path.join(binDir, 'yt-dlp')

if (!fs.existsSync(binDir)) fs.mkdirSync(binDir, { recursive: true })

if (fs.existsSync(binPath)) {
    const size = fs.statSync(binPath).size
    if (size > 1000000) {
        console.log('✅ yt-dlp already exists (' + (size / 1024 / 1024).toFixed(2) + ' MB)')
        process.exit(0)
    }
}

const platform = process.platform
const arch = process.arch

let url = null

if (platform === 'linux') {
    if (arch === 'x64') {
        url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux'
    } else if (arch === 'arm64') {
        url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux_aarch64'
    }
}

if (!url) {
    console.log('⚠️ Unsupported platform: ' + platform + '/' + arch)
    console.log('Skipping yt-dlp download.')
    process.exit(0)
}

console.log('📥 Downloading yt-dlp for ' + platform + '/' + arch)
console.log('   URL: ' + url)

function download(link, dest, redirects = 0) {
    return new Promise((resolve, reject) => {
        if (redirects > 5) return reject(new Error('Too many redirects'))

        https.get(link, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; B7R-API)' }
        }, (response) => {
            if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
                const next = response.headers.location
                if (!next) return reject(new Error('No redirect location'))
                return download(next, dest, redirects + 1).then(resolve).catch(reject)
            }

            if (response.statusCode !== 200) {
                return reject(new Error('HTTP ' + response.statusCode))
            }

            const file = fs.createWriteStream(dest)
            response.pipe(file)

            file.on('finish', () => {
                file.close(() => {
                    try {
                        fs.chmodSync(dest, 0o755)
                        resolve()
                    } catch (e) {
                        reject(e)
                    }
                })
            })

            file.on('error', (err) => {
                try { fs.unlinkSync(dest) } catch {}
                reject(err)
            })
        }).on('error', reject)
    })
}

try {
    await download(url, binPath)
    const size = (fs.statSync(binPath).size / 1024 / 1024).toFixed(2)
    console.log('✅ yt-dlp downloaded successfully (' + size + ' MB)')
} catch (e) {
    console.error('❌ Failed to download yt-dlp: ' + e.message)
    process.exit(1)
}
