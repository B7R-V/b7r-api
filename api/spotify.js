import { downloadTrack, getSpotifyInfo, getPlaylistTracks, extractSpotifyType } from '../lib/spotify.js'

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') return res.status(200).end()

    let url, download, downloadAll, maxTracks

    if (req.method === 'GET') {
        url = req.query.url
        download = req.query.download === 'true'
        downloadAll = req.query.downloadAll === 'true'
        maxTracks = parseInt(req.query.maxTracks) || 20
    } else if (req.method === 'POST') {
        url = req.body?.url
        download = !!req.body?.download
        downloadAll = !!req.body?.downloadAll
        maxTracks = req.body?.maxTracks || 20
    } else {
        return res.status(405).json({ success: false, error: 'Method not allowed' })
    }

    if (!url) return res.status(400).json({ success: false, error: 'url required' })
    if (!/spotify\.com/i.test(url)) return res.status(400).json({ success: false, error: 'Not Spotify URL' })

    try {
        const info = extractSpotifyType(url)
        if (!info) return res.status(400).json({ success: false, error: 'Invalid Spotify URL' })

        // ── Track ──
        if (info.type === 'track') {
            const meta = await getSpotifyInfo(url)
            const parts = meta.title.split(' - ')
            const title = parts[0]
            const artist = parts[1] || ''

            if (download) {
                const file = await downloadTrack(title, artist)
                return res.json({
                    success: true,
                    type: 'track',
                    title,
                    artist,
                    thumbnail: meta.thumbnail,
                    ...file
                })
            }
            return res.json({
                success: true,
                type: 'track',
                title,
                artist,
                thumbnail: meta.thumbnail
            })
        }

        // ── Playlist / Album / Artist ──
        const meta = await getSpotifyInfo(url)
        const tracks = await getPlaylistTracks(url, info.type)

        if (downloadAll) {
            const results = []
            for (let i = 0; i < tracks.length; i++) {
                const t = tracks[i]
                try {
                    const f = await downloadTrack(t.title, t.artist)
                    results.push({ index: i + 1, ...t, ...f, success: true })
                } catch (e) {
                    results.push({ index: i + 1, ...t, success: false, error: e.message })
                }
            }
            return res.json({
                success: true,
                type: info.type,
                title: meta.title,
                thumbnail: meta.thumbnail,
                total: results.length,
                tracks: results
            })
        }

        res.json({
            success: true,
            type: info.type,
            title: meta.title,
            thumbnail: meta.thumbnail,
            total: tracks.length,
            tracks
        })
    } catch (e) {
        console.error('[Spotify]', e.message)
        res.status(500).json({ success: false, error: e.message })
    }
}
