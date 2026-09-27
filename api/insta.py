from flask import Flask, request, jsonify
from flask_cors import CORS
import instaloader
import re

app = Flask(__name__)
CORS(app)

@app.route('/api/insta', methods=['GET'])
def download_instagram():
    url = request.args.get('url')
    if not url:
        return jsonify({'success': False, 'error': 'Missing url parameter'}), 400
    match = re.search(r'/(p|reel|tv)/([^/?#&]+)', url)
    if not match:
        return jsonify({'success': False, 'error': 'Invalid Instagram URL'}), 400

    shortcode = match.group(2)
    loader = instaloader.Instaloader()

    try:
        post = instaloader.Post.from_shortcode(loader.context, shortcode)
        return jsonify({
            'dev': 'b7r',
            'success': True,
            'platform': 'instagram',
            'title': post.caption[:200] if post.caption else '',
            'thumbnail': post.url,
            'video': post.video_url,
            'audio': post.video_url,
            'uploader': post.owner_username,
            'duration': post.video_duration if post.is_video else 0
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
