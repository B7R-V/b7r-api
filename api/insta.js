import allmediadl from 'allmediadl';

export const config = {
    maxDuration: 60
};

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    const url = req.query?.url || req.body?.url;

    if (!url || !/^https?:\/\//i.test(url)) {
        return res.status(400).json({ 
            success: false, 
            error: 'Invalid or missing URL' 
        });
    }

    try {
        // استخدام fetchMetaData المخصصة لـ Facebook/Instagram
        // أو يمكن استخدام allmediadl.download(url) للاكتشاف التلقائي
        const result = await allmediadl.download(url);

        if (!result || !result.data) {
            return res.status(404).json({ 
                success: false, 
                error: 'No downloadable media found' 
            });
        }

        const media = result.data;

        // استخراج رابط الفيديو (الحقول قد تختلف حسب الـ API)
        const videoUrl = media.url || 
                         media.video || 
                         media.download_url || 
                         media.video_url ||
                         media.media?.[0]?.url ||
                         media.media?.[0]?.video_url;

        if (!videoUrl) {
            return res.status(404).json({ 
                success: false, 
                error: 'Video URL not found in response' 
            });
        }

        return res.status(200).json({
            success: true,
            platform: 'instagram',
            title: (media.title || media.caption || 'Instagram Video').slice(0, 200),
            thumbnail: media.thumbnail || media.thumbnail_url || '',
            video: videoUrl,
            audio: media.audio || videoUrl,
            uploader: media.author || media.username || ''
        });

    } catch (e) {
        console.error('[INSTAGRAM]', e.message);
        return res.status(500).json({ 
            success: false, 
            error: e.message || 'Download failed' 
        });
    }
            }
