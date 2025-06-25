import express from 'express';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import cheerio from 'cheerio';
import { URL } from 'url';

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3010;
const PYTHON_BASE = process.env.PYTHON_BASE_URL || 'http://python:8000';

// 1. Health Check
app.get('/', (req, res) => res.json({ status: 'running' }));

// 2. Sitemap Analysis → FastAPI
app.post('/sitemap', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing url' });
  try {
    const response = await axios.post(`${PYTHON_BASE}/sitemap`, { url, max_urls: 100 });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Advanced Schema Generation (JS)
app.post('/schema', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing url' });
  try {
    const { data: html } = await axios.get(url, { timeout: 15000 });
    const $ = cheerio.load(html);
    const name = $('head > title').text() || url;
    const description = $('meta[name="description"]').attr('content') || '';
    const schema = { '@context': 'https://schema.org', '@type': 'WebPage', url, name, description };
    const text = $('body').text().replace(/\s+/g, ' ').trim();
    const words = text ? text.split(' ') : [];
    const tokens = text.match(/\b\w+\b/g) || [];
    res.json({
      from_existing_schema: ['WebPage'],
      used_type: 'WebPage',
      schema,
      extract: {
        word_count: words.length,
        n_tokens: tokens.length,
        avg_token_length: tokens.length ? tokens.reduce((s,t)=>s+t.length,0)/tokens.length : 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. NLP Text Analysis → FastAPI
app.post('/extract', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Missing text' });
  try {
    const response = await axios.post(`${PYTHON_BASE}/extract`, { text });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Entity Validation (JS)
app.post('/validate-entity', (req, res) => {
  const { type, properties } = req.body;
  const errors = [];
  if (!type || typeof properties !== 'object') errors.push('Missing type or properties');
  if (type==='Organization' && !properties.name) errors.push('Organization.name is required');
  return errors.length ? res.status(400).json({ errors }) : res.json({ valid: true, type, properties });
});

// 6. URL Clustering (JS)
app.post('/cluster', async (req, res) => {
  const { url, level } = req.body;
  if (!url || typeof level!=='number') return res.status(400).json({ error: 'Missing url or level' });
  try {
    const { data: xml } = await axios.get(url, { timeout:15000 });
    const parsed = await parseStringPromise(xml);
    const urls = (parsed.sitemapindex?.sitemap || parsed.urlset?.url || []).map(u=>u.loc[0]);
    const clusters = {};
    urls.forEach(u=>{
      const key = (new URL(u).pathname.split('/').filter(Boolean)[level-1]||'');
      clusters[key]=(clusters[key]||0)+1;
    });
    res.json({ cluster_by:`dir_${level}`, clusters });
  }catch(err){res.status(500).json({error:err.message});}
});

app.listen(PORT, ()=>console.log(`Node API on port ${PORT}`));
