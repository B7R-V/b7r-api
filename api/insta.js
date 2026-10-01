import axios from 'axios'

export const config = {
    maxDuration: 60
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', 'application/json; charset=utf-8')

    const url = req.query?.url || req.body?.url

    if (!url || typeof url !== 'string') {
        return res.status(400).json({
            success: false,
            error: 'Missing url parameter'
        })
    }

    try {
        // اختبار: هل الدالة الأساسية شغالة؟
        const { data } = await axios.get('https://savefromins.com/ar', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36'
            },
            timeout: 15000
        })

        return res.status(200).json({
            success: true,
            test: 'axios works',
            htmlLength: String(data).length,
            hasNextScript: String(data).includes('_next')
        })
    } catch (e) {
        return res.status(500).json({
            success: false,
            error: e.message,
            code: e.code,
            test: 'axios failed'
        })
    }
}
