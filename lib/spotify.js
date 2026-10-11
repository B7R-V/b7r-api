import axios from 'axios'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36'

export function parseSpotifyUrl(url) {
    const m = url.match(/spotify\.com\/(?:intl-[a-z]+\/)?(track|playlist|album|artist|episode)\/([A-Za-z0-9]+)/)
    if (!m) throw new Error('Invalid Spotify URL')
    return { type: m[1], id: m[2] }
}

export async function getSpotifyInfo(url) {
    const { type, id } = parseSpotifyUrl(url)
    const { data } = await axios.get(
        `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`,
        { timeout: 10000, headers: { 'User-Agent': UA } }
    )
    let title = data.title || ''
    let artist = ''
    if (type === 'track' || type === 'episode') {
        const parts = title.split(' - ')
        if (parts.length >= 2) {
            artist = parts[1]
            title = parts[0]
        }
    }
    return {
        type, id, title, artist,
        thumbnail: data.thumbnail_url || '',
        provider: data.provider_name || 'Spotify',
        url
    }
}

export async function getPlaylistTracks(id, type) {
    const embedUrl = `https://open.spotify.com/embed/${type}/${id}`
    const { data: html } = await axios.get(embedUrl, {
        timeout: 15000,
        headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml' }
    })
    const match = String(html).match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
    if (!match) throw new Error('Cannot parse data')
    const json = JSON.parse(match[1])
    const entity = json?.props?.pageProps?.state?.data?.entity
    if (!entity) throw new Error('No entity found')
    const trackList = entity.trackList || entity.tracks?.items || []
    return trackList.map((t, i) => ({
        index: i + 1,
        id: t.uid || t.id || null,
        title: t.title || t.name || '',
        artist: (t.subtitle || '').split(' • ')[0].split(', ')[0],
        duration: t.duration || null
    }))
}

export async function downloadTrack(trackId) {
    const errors = []

    // spotifydown
    try {
        const { data } = await axios.get(
            `https://api.spotifydown.com/download/${trackId}`,
            { timeout: 20000, headers: {
                'Origin': 'https://spotifydown.com',
                'Referer': 'https://spotifydown.com/',
                'User-Agent': UA
            }}
        )
        if (data?.success && data?.link) {
            return {
                downloadUrl: data.link,
                size: data.metadata?.size || 0,
                format: 'mp3',
                provider: 'spotifydown'
            }
        }
    } catch (e) { errors.push('spotifydown: ' + e.message) }

    // spotidown
    try {
        const { data } = await axios.post(
            'https://spotidown.app/action/track',
            `url=https://open.spotify.com/track/${trackId}`,
            { timeout: 20000, headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': UA,
                'Origin': 'https://spotidown.app',
                'Referer': 'https://spotidown.app/'
            }}
        )
        if (data?.url || data?.download_url) {
            return { downloadUrl: data.url || data.download_url, size: 0, format: 'mp3', provider: 'spotidown' }
        }
    } catch (e) { errors.push('spotidown: ' + e.message) }

    // spotmate
    try {
        const { data } = await axios.get(
            'https://spotmate.online/getTrackData',
            { params: { spotify_id: trackId }, timeout: 20000, headers: {
                'User-Agent': UA,
                'Origin': 'https://spotmate.online',
                'Referer': 'https://spotmate.online/'
            }}
        )
        if (data?.url) {
            return { downloadUrl: data.url, size: 0, format: 'mp3', provider: 'spotmate' }
        }
    } catch (e) { errors.push('spotmate: ' + e.message) }

    throw new Error('All providers failed: ' + errors.join(' | '))
}

export async function downloadPlaylist(tracks, maxTracks = 20) {
    const results = []
    const limited = tracks.slice(0, maxTracks)
    for (const t of limited) {
        try {
            if (!t.id) { results.push({ ...t, success: false, error: 'No ID' }); continue }
            const dl = await downloadTrack(t.id)
            results.push({ ...t, success: true, ...dl })
        } catch (e) {
            results.push({ ...t, success: false, error: e.message })
        }
        await new Promise(r => setTimeout(r, 500))
    }
    return {
        total: limited.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        tracks: results
    }
}

export async function handleSpotifyRequest({ url, download, downloadAll, maxTracks }) {
    const info = await getSpotifyInfo(url)

    if (info.type === 'track') {
        if (download) {
            const dl = await downloadTrack(info.id)
            return { success: true, type: 'track', ...info, ...dl }
        }
        return { success: true, type: 'track', ...info }
    }

    if (['playlist', 'album', 'artist'].includes(info.type)) {
        const tracks = await getPlaylistTracks(info.id, info.type)

        if (downloadAll) {
            const all = await downloadPlaylist(tracks, maxTracks || 20)
            return {
                success: true, type: info.type, id: info.id,
                title: info.title, thumbnail: info.thumbnail, ...all
            }
        }

        return {
            success: true, type: info.type, id: info.id,
            title: info.title, thumbnail: info.thumbnail,
            total: tracks.length, tracks
        }
    }

    if (info.type === 'episode') {
        if (download) {
            const dl = await downloadTrack(info.id)
            return { success: true, type: 'episode', ...info, ...dl }
        }
        return { success: true, type: 'episode', ...info }
    }

    return { success: true, ...info }
            }
