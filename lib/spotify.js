import axios from 'axios'
import fs from 'fs'
import path from 'path'
import os from 'os'
import https from 'https'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const BIN_DIR = path.join(process.cwd(), 'bin')
const YTDLP_PATH = path.join(BIN_DIR, 'yt-dlp')
const COOKIES_FILE = path.join(os.tmpdir(), 'cookies.txt')
const TMP_DIR = path.join(os.tmpdir(), 'spotify-dl')

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true })
if (!fs.existsSync(BIN_DIR)) fs.mkdirSync(BIN_DIR, { recursive: true })

const COOKIES_CONTENT = `# Netscape HTTP Cookie File
.youtube.com	TRUE	/	TRUE	1790511429	GPS	1
.youtube.com	TRUE	/	TRUE	1825069830	PREF	f6=40000000&tz=Africa.Cairo
.youtube.com	TRUE	/	TRUE	1790509857	YTSESSION-rvkia	ANPz9KgUAPmOOVHRQuud/MOdFetkdPxa3PuxcRP2A87bDB7qVInfA8wdFJ7C+lEJHMDD/WH9VNzqhX02n87wthFA/l96waMTQ8bTbCxdaVNil2+qXLTHmemHnwEQd3JH0AbXeLCjE1b+QNyQfPllFh2O1baALCIGF+NUSMOFe3B37CmVZEam7WInuuyNoGtyOtfMI3IvdpwY3vSkmGW0ed3SpCpk4t2QZAv/yX90Y9HwNJYsK1idAYdAcT7bnBF8BpTybZuVyehZK1NyZXzD6TaHYT+hof3Y6YuikH2q0sVpIAYBuwy4NSALOJuZfOKSvp76bpLigZWgOBuF29Yh4rkW1jj5gVWavA==
.youtube.com	TRUE	/	TRUE	1822045823	__Secure-1PSIDTS	sidts-CjQBkldj_0Cm9LHeBtI4FFiz8Na1AhbLmmaZTHXw8SBkWgs2NMfC24YJB2nOzQ01E88A2xYbEAA
.youtube.com	TRUE	/	TRUE	1822045823	__Secure-3PSIDTS	sidts-CjQBkldj_0Cm9LHeBtI4FFiz8Na1AhbLmmaZTHXw8SBkWgs2NMfC24YJB2nOzQ01E88A2xYbEAA
.youtube.com	TRUE	/	FALSE	1825069833	HSID	Aoucz7gntSRRKYqDS
.youtube.com	TRUE	/	TRUE	1825069833	SSID	AyqwqrawXr2c7qkqH
.youtube.com	TRUE	/	FALSE	1825069833	APISID	IM02DkY6qCXKCv9g/AWsSboPwpZHF7MNkB
.youtube.com	TRUE	/	TRUE	1825069833	SAPISID	rtLlROy7zAZPLs8z/AuK5Ld7dZNIDRavcA
.youtube.com	TRUE	/	TRUE	1825069833	__Secure-1PAPISID	rtLlROy7zAZPLs8z/AuK5Ld7dZNIDRavcA
.youtube.com	TRUE	/	TRUE	1825069833	__Secure-3PAPISID	rtLlROy7zAZPLs8z/AuK5Ld7dZNIDRavcA
.youtube.com	TRUE	/	TRUE	1825069827	LOGIN_INFO	AFmmF2swRQIgWk3RJsq1as5U0JCb6a_t6F9gp0CXlDc32Vu4j7839oACIQCsqpl4SenxDDE_0JZ9EyMYiRu6h3M0sTKLUd_n5MakHA:QUQ3MjNmdy03LThRYlljN2FHVXZTMlRyLUpBaTlPMDVGTGg3aEVkVTY1UEg0ZlgwR1hZMXRxeFQ4ZmFFY2VxME9VSTNmYnIwanJ1bzRuR0ZjZ2tBXzZKdDFOT041N3NiVGVoYkxCWDN0NjNJWFlPWGRjcExFN1FBN2EyVnQzZXZ5WkNFVnhTVTMyT2MyMm0xWnYzR0VFVWZkakJsVjFKRGNB
.youtube.com	TRUE	/	TRUE	1790509947	YTSESSION-1nge1wu	ANPz9Khp+Vhivgj/tLGcEK/5jBc4yILCcOk8hr156VwFOZZWEtYqWAgEqyra7bmIQOIWnSY5abL4QEEm9JlyVz3XSPjJ0EDbi09AB+o=
.youtube.com	TRUE	/	FALSE	1822045833	SIDCC	AKEyXzVnKmrb3Y-x_awY8fqFNVAnl4H1D1aQM3XM0LPjeJCKj_-xsSj66ID-AhrxB95v-LWh
.youtube.com	TRUE	/	TRUE	1822045833	__Secure-1PSIDCC	AKEyXzV7foLg5-MCkuYnwJQKQ40iTsdF-dKhHVb73X-sN81B2ySmNtSvDKkooLdLz9ha7Yyo
.youtube.com	TRUE	/	TRUE	1822045833	__Secure-3PSIDCC	AKEyXzU3AvrnfJX0o5o62pd7pZ0F44JM9cdpJg2LfyDuwBnkgl0XIT7_IHyafqDrQg0crZXseA
.youtube.com	TRUE	/	FALSE	1825069833	SID	g.a000DAkdE23YMhE82YnXeARMUVGjklHiZu_g-mXv6FA05O57VBCIdfiZBv0Qocp5oUDRQr1mJgACgYKAcoSAQ4SFQHGX2MikWfneaoTZADJOmFz4JxDOhoVAUF8yKrxXpn2X-sGWWNoEId9NO590076
.youtube.com	TRUE	/	TRUE	1825069833	__Secure-1PSID	g.a000DAkdE23YMhE82YnXeARMUVGjklHiZu_g-mXv6FA05O57VBCInfobcmFVcwtmHwJNwwugRAACgYKARUSAQ4SFQHGX2MigQzbHhUn0EWAzwkO1_A5hRoVAUF8yKo_ssiUkWMqt8cupqDOJFom0076
.youtube.com	TRUE	/	TRUE	1825069833	__Secure-3PSID	g.a000DAkdE23YMhE82YnXeARMUVGjklHiZu_g-mXv6FA05O57VBCI6Sj8ulWGqdwMdfbEu0RF9wACgYKAb0SAQ4SFQHGX2MiEPbBNZ9ICPPjCDSnGhNN1hoVAUF8yKrgZzVCuqLG31goxc7nAePw0076
`

function writeCookies() {
    try { fs.writeFileSync(COOKIES_FILE, COOKIES_CONTENT, 'utf-8') } catch {}
}

export function extractSpotifyType(url) {
    const m = url.match(/spotify\.com\/(?:intl-[a-z]+\/)?(track|playlist|album|artist)\/([A-Za-z0-9]+)/)
    if (!m) return null
    return { type: m[1], id: m[2] }
}

function detectArch() {
    const arch = os.arch()
    const map = {
        'x64': 'yt-dlp_linux',
        'x86_64': 'yt-dlp_linux',
        'arm64': 'yt-dlp_linux_aarch64',
        'aarch64': 'yt-dlp_linux_aarch64',
        'arm': 'yt-dlp_linux_armv7l',
        'armv7l': 'yt-dlp_linux_armv7l'
    }
    return map[arch] || 'yt-dlp_linux'
}

function downloadFileHttps(url, dest, redirects = 0) {
    return new Promise((resolve, reject) => {
        if (redirects > 5) return reject(new Error('Too many redirects'))
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
                return downloadFileHttps(res.headers.location, dest, redirects + 1).then(resolve).catch(reject)
            }
            if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`))
            const file = fs.createWriteStream(dest)
            res.pipe(file)
            file.on('finish', () => file.close(() => {
                try { fs.chmodSync(dest, 0o755); resolve() } catch (e) { reject(e) }
            }))
            file.on('error', (err) => { try { fs.unlinkSync(dest) } catch {}; reject(err) })
        }).on('error', reject)
    })
}

async function ensureYtdlp() {
    if (fs.existsSync(YTDLP_PATH)) {
        try {
            const stat = fs.statSync(YTDLP_PATH)
            if (stat.size > 1000000) {
                await execAsync(`"${YTDLP_PATH}" --version`, { timeout: 10000 })
                return YTDLP_PATH
            }
        } catch { try { fs.unlinkSync(YTDLP_PATH) } catch {} }
    }
    try {
        await execAsync('yt-dlp --version', { timeout: 10000 })
        return 'yt-dlp'
    } catch {}
    if (!fs.existsSync(BIN_DIR)) fs.mkdirSync(BIN_DIR, { recursive: true })
    const binary = detectArch()
    const url = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${binary}`
    await downloadFileHttps(url, YTDLP_PATH)
    return YTDLP_PATH
}

export async function getSpotifyInfo(url) {
    const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`
    const { data } = await axios.get(oembedUrl, {
        timeout: 20000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    return {
        title: data.title || '',
        thumbnail: data.thumbnail_url || '',
        provider: data.provider_name || 'Spotify'
    }
}

export async function getPlaylistTracks(url, type) {
    const id = url.split('/').pop().split('?')[0]
    const embedUrl = `https://open.spotify.com/embed/${type}/${id}`

    const { data: html } = await axios.get(embedUrl, {
        timeout: 20000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html'
        }
    })

    const match = String(html).match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
    if (!match) throw new Error('Cannot parse playlist')

    const json = JSON.parse(match[1])
    const entity = json?.props?.pageProps?.state?.data?.entity

    if (!entity || !entity.trackList) throw new Error('No tracks')

    return entity.trackList.map(t => ({
        title: t.title,
        artist: (t.subtitle || '').split(' • ')[0].split(', ')[0],
        duration: t.duration
    }))
}

export async function downloadTrack(title, artist) {
    writeCookies()
    const ytdlp = await ensureYtdlp()
    const safeName = `${String(title).replace(/[^\w\s-]/g, '').slice(0, 40)}_${Date.now()}`
    const outputTemplate = path.join(TMP_DIR, `${safeName}.%(ext)s`)
    const query = `${title} ${artist || ''} audio`.trim()
    const cookiesArg = fs.existsSync(COOKIES_FILE) ? `--cookies "${COOKIES_FILE}"` : ''

    const cmd = `"${ytdlp}" "ytsearch1:${query}" -o "${outputTemplate}" -f "ba/b" -x --audio-format mp3 --audio-quality 9 --no-playlist --no-warnings --no-check-certificate --js-runtimes node --remote-components ejs:github ${cookiesArg} --extractor-args "youtube:player_client=android,ios,web_safari,tv_embedded,web,default" 2>&1`

    let out = ''
    try {
        const result = await execAsync(cmd, { timeout: 180000, maxBuffer: 1024 * 1024 * 50 })
        out = (result.stdout || '') + (result.stderr || '')
    } catch (e) {
        out = (e.stdout || '') + (e.stderr || '') + (e.message || '')
    }

    const files = fs.readdirSync(TMP_DIR).filter(f =>
        f.startsWith(safeName) &&
        (f.endsWith('.mp3') || f.endsWith('.m4a') || f.endsWith('.webm') || f.endsWith('.opus'))
    )

    if (!files.length) throw new Error('Download failed: ' + out.slice(-200))

    const filePath = path.join(TMP_DIR, files[0])
    const size = fs.statSync(filePath).size

    return {
        filePath,
        fileName: files[0],
        size,
        format: 'mp3'
    }
        }
