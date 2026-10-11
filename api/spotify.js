import { handleSpotify } from '../lib/spotify.js'

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
        const result = await handleSpotify({ url, download, downloadAll, maxTracks })
        res.json(result)
    } catch (e) {
        console.error('[Spotify]', e.message)
        res.status(500).json({ success: false, error: e.message })
    }
}
