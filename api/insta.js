import { InstagramScraper } from '@aduptive/instagram-scraper';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const url = req.query?.url;
    if (!url) return res.status(400).json({ success: false, error: 'Missing url' });

    const scraper = new InstagramScraper();

    try {
        const result = await scraper.getPost(url);
        if (!result.success || !result.post || !result.post.media_items || !result.post.media_items.length) {
            return res.status(404).json({ success: false, error: result.error || 'No media found' });
        }
        const mediaItem = result.post.media_items.find(item => item.type === 'video') || result.post.media_items[0];
        return res.status(200).json({
            success: true,
            platform: 'instagram',
            title: (result.post.caption || 'Instagram Media').slice(0, 200),
            thumbnail: result.post.display_url || '',
            video: mediaItem.url,
            audio: mediaItem.url,
            uploader: result.post.owner_username || ''
        });
    } catch (e) {
        console.error('[INSTAGRAM]', e.message);
        return res.status(500).json({ success: false, error: e.message });
    }
            }
