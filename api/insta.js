async function parseInstagram(url) {
    const auth = await fetchAuth()
    console.log('[SFI] Using auth:', auth)

    const params = new URLSearchParams({
        auth,
        domain: DOMAIN_VIDEO,
        origin: 'source',
        link: url
    })

    const r = await axios.post(`${API_BASE}/media/parse`, params.toString(), {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': UA,
            'Origin': 'https://savefromins.com',
            'Referer': 'https://savefromins.com/'
        },
        timeout: 30000
    })

    console.log('[SFI] Response status:', r.status)
    console.log('[SFI] Response body:', JSON.stringify(r.data).slice(0, 500))

    const data = r.data?.data
    if (!data) {
        throw new Error(
            `فشل تحليل الرابط — API رد: ${JSON.stringify(r.data).slice(0, 200)}`
        )
    }

    return {
        title: data.title || 'Instagram Media',
        thumbnail: data.thumbnail || '',
        duration: data.duration || 0,
        resources: data.resources || []
    }
}
