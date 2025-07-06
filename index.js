
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import * as cheerio from 'cheerio';
import { URL } from 'url';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3010;
const PYTHON_BASE = process.env.PYTHON_BASE_URL || 'http://python:8000';

// 1. Health Check
app.get('/', (req, res) => {
  res.json({ 
    status: 'running',
    service: 'schema-api-full',
    version: '1.0.0',
    python_service: PYTHON_BASE,
    endpoints: ['/sitemap', '/schema', '/extract', '/cluster', '/validate-entity']
  });
});

// 2. Sitemap Analysis → FastAPI
app.post('/sitemap', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing url parameter' });
  
  try {
    console.log(`📡 Forwarding sitemap request to Python: ${url}`);
    const response = await axios.post(`${PYTHON_BASE}/sitemap`, req.body, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    res.json(response.data);
  } catch (err) {
    console.error('Sitemap error:', err.message);
    if (err.response) {
      res.status(err.response.status).json(err.response.data);
    } else {
      res.status(500).json({ 
        error: 'Failed to connect to Python service',
        details: err.message,
        python_service: PYTHON_BASE
      });
    }
  }
});

// 3. Advanced Schema Generation (JS)
app.post('/schema', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing url parameter' });
  
  try {
    console.log(`🔍 Analyzing schema for: ${url}`);
    const { data: html } = await axios.get(url, { 
      timeout: 15000,
      headers: {
        'User-Agent': 'Schema-API-Full/1.0.0'
      }
    });
    
    const $ = cheerio.load(html);
    const name = $('head > title').text().trim() || new URL(url).hostname;
    const description = $('meta[name="description"]').attr('content') || '';
    
    const schema = { 
      '@context': 'https://schema.org', 
      '@type': 'WebPage', 
      url, 
      name, 
      description 
    };
    
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
        avg_token_length: tokens.length ? Math.round(tokens.reduce((s,t) => s + t.length, 0) / tokens.length * 100) / 100 : 0
      }
    });
  } catch (err) {
    console.error('Schema generation error:', err.message);
    res.status(500).json({ error: 'Schema generation failed', details: err.message });
  }
});

// 4. NLP Text Analysis → FastAPI
app.post('/extract', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Missing text parameter' });
  
  try {
    console.log(`📝 Forwarding text analysis to Python (${text.length} chars)`);
    const response = await axios.post(`${PYTHON_BASE}/extract`, req.body, {
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    res.json(response.data);
  } catch (err) {
    console.error('Text analysis error:', err.message);
    if (err.response) {
      res.status(err.response.status).json(err.response.data);
    } else {
      res.status(500).json({ 
        error: 'Failed to connect to Python service for text analysis',
        details: err.message
      });
    }
  }
});

// 5. Entity Validation (JS)
app.post('/validate-entity', (req, res) => {
  const { type, properties } = req.body;
  const errors = [];
  
  if (!type || typeof properties !== 'object') {
    errors.push('Missing type or properties');
  }
  
  if (type === 'Organization' && !properties.name) {
    errors.push('Organization.name is required');
  }
  
  if (type === 'Person' && !properties.name) {
    errors.push('Person.name is required');
  }
  
  return errors.length ? 
    res.status(400).json({ valid: false, errors }) : 
    res.json({ valid: true, type, properties });
});

// 6. URL Clustering (JS)
app.post('/cluster', async (req, res) => {
  const { url, level } = req.body;
  if (!url || typeof level !== 'number') {
    return res.status(400).json({ error: 'Missing url or level parameters' });
  }
  
  try {
    console.log(`🔗 Clustering URLs from sitemap: ${url}, level: ${level}`);
    const { data: xml } = await axios.get(url, { 
      timeout: 15000,
      headers: {
        'User-Agent': 'Schema-API-Full/1.0.0'
      }
    });
    
    const parsed = await parseStringPromise(xml);
    const urls = (parsed.sitemapindex?.sitemap || parsed.urlset?.url || [])
      .map(u => u.loc[0])
      .filter(Boolean);
    
    const clusters = {};
    urls.forEach(u => {
      try {
        const urlPath = new URL(u).pathname;
        const pathParts = urlPath.split('/').filter(Boolean);
        const key = pathParts[level - 1] || 'root';
        clusters[key] = (clusters[key] || 0) + 1;
      } catch (e) {
        // Skip invalid URLs
      }
    });
    
    res.json({ 
      cluster_by: `dir_${level}`, 
      clusters,
      total_urls: urls.length,
      clustered_urls: Object.values(clusters).reduce((a, b) => a + b, 0)
    });
  } catch (err) {
    console.error('Clustering error:', err.message);
    res.status(500).json({ error: 'URL clustering failed', details: err.message });
  }
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Schema API Full running on port ${PORT}`);
  console.log(`📡 Python service: ${PYTHON_BASE}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/`);
});
