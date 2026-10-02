export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', 'application/json; charset=utf-8')

    return res.status(200).json({
        success: true,
        status: 'online',
        service: 'B7R API',
        version: '1.0.0',
        description: 'Media Downloader'
    })
}