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

// Health Check מתוקן
app.get('/', (req, res) => {
  res.json({ 
    status: 'running',
    service: 'schema-api-full',
    version: '1.0.0',
    endpoints: ['/sitemap', '/schema', '/extract', '/cluster', '/validate-entity']
  });
});

// Sitemap Analysis → Python Service
app.post('/sitemap', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing url parameter' });
  
  try {
    const response = await axios.post(`${PYTHON_BASE}/sitemap`, req.body, {
      timeout: 30000
    });
    res.json(response.data);
  } catch (err) {
    console.error('Sitemap error:', err.message);
    res.status(500).json({ 
      error: 'Sitemap processing failed',
      details: err.response?.data || err.message 
    });
  }
});

// יתר הendpoints נשארים כמו שהם...
// (הקוד שלך נראה תקין)

// Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Schema API Full running on port ${PORT}`);
  console.log(`📡 Python service: ${PYTHON_BASE}`);
});
