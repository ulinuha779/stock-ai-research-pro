export default async function handler(req, res) {
  const keyword = String(req.query.keyword || '').trim();
  const contentType = String(req.query.contentType || 'photo').trim();
  const locale = String(req.query.locale || 'en_US').trim();
  const isolated = String(req.query.isolated || '0') === '1';

  if (!keyword) {
    return res.status(400).json({ error: 'Keyword wajib diisi.' });
  }

  const apiKey = process.env.ADOBE_STOCK_API_KEY;
  const product = process.env.ADOBE_STOCK_PRODUCT || 'StockMarketResearchPro/1.0';

  if (!apiKey) {
    return res.status(500).json({ error: 'Environment variable ADOBE_STOCK_API_KEY belum diisi.' });
  }

  const params = new URLSearchParams();
  params.set('locale', locale);
  params.set('search_parameters[words]', keyword);
  params.set('search_parameters[limit]', '8');
  params.set('search_parameters[offset]', '0');
  params.set('result_columns[]', 'id');
  params.append('result_columns[]', 'title');
  params.append('result_columns[]', 'thumbnail_url');
  params.append('result_columns[]', 'content_type');
  params.append('result_columns[]', 'nb_results');

  const allowedTypes = new Set(['photo', 'illustration', 'vector', 'video']);
  const type = allowedTypes.has(contentType) ? contentType : 'photo';
  params.set(`search_parameters[filters][content_type:${type}]`, '1');

  if (isolated && type !== 'video') {
    params.set('search_parameters[filters][isolated:on]', '1');
  }
  if (type === 'video') {
    params.set('search_parameters[filters][video_duration]', '10');
  }

  const url = `https://stock.adobe.io/Rest/Media/1/Search/Files?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        'x-api-key': apiKey,
        'x-product': product,
        'accept': 'application/json'
      }
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error || data?.message || `Adobe API error ${response.status}`,
        details: data
      });
    }

    return res.status(200).json({
      nb_results: Number(data?.nb_results || 0),
      files: Array.isArray(data?.files) ? data.files.map(f => ({
        id: f.id,
        title: f.title,
        thumbnail_url: f.thumbnail_url,
        content_type: f.content_type
      })) : []
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Gagal menghubungi Adobe Stock API.' });
  }
}
