const express = require('express');
const cors = require('cors');
const axios = require('axios');
const xml2js = require('xml2js');
const cheerio = require('cheerio');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3010;

// Recursive sitemap parsing function
async function getAllUrlsFromSitemap(sitemapUrl, maxDepth = 2, currentDepth = 0, maxUrls = 10000) {
  if (currentDepth >= maxDepth) return [];
  
  try {
    console.log(`Fetching sitemap level ${currentDepth}: ${sitemapUrl}`);
    const response = await axios.get(sitemapUrl, { 
      timeout: 15000,
      headers: { 'User-Agent': 'Schema-API/2.0.0' }
    });
    
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(response.data);
    
    let allUrls = [];
    
    if (result.sitemapindex?.sitemap) {
      // זה sitemap index - חדור לכל sub-sitemap
      console.log(`Found ${result.sitemapindex.sitemap.length} sub-sitemaps`);
      
      for (const sitemap of result.sitemapindex.sitemap.slice(0, 20)) {
        if (allUrls.length >= maxUrls) break;
        
        try {
          const subUrls = await getAllUrlsFromSitemap(
            sitemap.loc[0], 
            maxDepth, 
            currentDepth + 1, 
            maxUrls - allUrls.length
          );
          allUrls = allUrls.concat(subUrls);
          
          // קצת delay כדי לא להציף השרת
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (e) {
          console.warn('Failed to fetch sub-sitemap:', sitemap.loc[0], e.message);
        }
      }
    } else if (result.urlset?.url) {
      // זה urlset רגיל - קח את הURLs
      allUrls = result.urlset.url
        .slice(0, maxUrls)
        .map(u => u.loc[0])
        .filter(url => url && url.startsWith('http'));
      
      console.log(`Found ${allUrls.length} URLs in urlset`);
    }
    
    return allUrls;
  } catch (error) {
    console.error(`Error fetching sitemap ${sitemapUrl}:`, error.message);
    return [];
  }
}

// Enhanced clustering function
function analyzeUrlClustering(urls) {
  const byMainCategory = {};
  const byDepth = {};
  const byFileType = {};
  const pathPatterns = {};
  const parameterAnalysis = {};
  
  urls.forEach(urlString => {
    try {
      const urlObj = new URL(urlString);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      const hasParams = urlObj.search.length > 0;
      
      // 1. Smart main category analysis (handles multilingual sites)
      let mainCategory = pathParts[0] || 'root';
      
      // Check if first segment is a language code (en, he, fr, etc.)
      const isLanguageCode = mainCategory.length === 2 && mainCategory.match(/^[a-z]{2}$/);
      
      if (isLanguageCode && pathParts.length > 1) {
        // If it's a language code, use the next segment as the main category
        mainCategory = pathParts[1];
      } else if (mainCategory.includes('%D7%') || mainCategory.includes('%D6%')) {
        // Handle Hebrew URL encoding
        try {
          const decoded = decodeURIComponent(mainCategory);
          if (decoded && decoded.match(/[\u0590-\u05FF]/)) {
            mainCategory = decoded;
          }
        } catch (e) {
          // If decoding fails and there's a next segment, use it
          if (pathParts.length > 1) {
            const nextSegment = pathParts[1];
            if (nextSegment && !nextSegment.includes('%')) {
              mainCategory = nextSegment;
            }
          }
        }
      }
      
      byMainCategory[mainCategory] = (byMainCategory[mainCategory] || 0) + 1;
      
      // 2. Depth analysis
      const depth = pathParts.length;
      const depthKey = `depth_${depth}`;
      byDepth[depthKey] = (byDepth[depthKey] || 0) + 1;
      
      // 3. File type analysis
      const lastPart = pathParts[pathParts.length - 1] || '';
      const fileExtension = lastPart.includes('.') ? 
        lastPart.split('.').pop().toLowerCase() : 'no_extension';
      byFileType[fileExtension] = (byFileType[fileExtension] || 0) + 1;
      
      // 4. Smart path pattern analysis (decode Hebrew for patterns)
      let fullPath = pathParts.join('/');
      if (fullPath) {
        // Try to decode Hebrew segments for better pattern detection
        const decodedParts = pathParts.map(part => {
          if (part.includes('%D7%') || part.includes('%D6%')) {
            try {
              return decodeURIComponent(part);
            } catch (e) {
              return part;
            }
          }
          return part;
        });
        
        const decodedPath = decodedParts.join('/');
        
        // Detect patterns like /blog/מאמר, /products/123, /blog/2024/01/post
        const pattern = decodedPath
          .replace(/\d+/g, '[ID]')
          .replace(/\b\d{4}\b/g, '[YEAR]')
          .replace(/\b\d{2}\b/g, '[NUM]')
          .replace(/[\u0590-\u05FF]+/g, '[HEBREW]'); // Replace Hebrew text with [HEBREW]
          
        pathPatterns[pattern] = (pathPatterns[pattern] || 0) + 1;
      }
      
      // 5. Parameter analysis
      if (hasParams) {
        const params = new URLSearchParams(urlObj.search);
        params.forEach((value, key) => {
          parameterAnalysis[key] = (parameterAnalysis[key] || 0) + 1;
        });
      }
      
    } catch (e) {
      // Skip invalid URLs
      console.warn('Invalid URL skipped:', urlString);
    }
  });
  
  // Sort all results by count (descending)
  const sortByCount = (obj) => 
    Object.entries(obj)
      .sort(([,a], [,b]) => b - a)
      .reduce((sorted, [key, value]) => ({ ...sorted, [key]: value }), {});
  
  return {
    by_main_category: sortByCount(byMainCategory),
    by_depth: sortByCount(byDepth),
    by_file_type: sortByCount(byFileType),
    by_path_patterns: sortByCount(pathPatterns),
    by_parameters: sortByCount(parameterAnalysis),
    
    // Summary insights (raw data, not conclusions)
    summary: {
      total_analyzed: urls.length,
      categories_found: Object.keys(byMainCategory).length,
      depth_levels: Object.keys(byDepth).length,
      file_types: Object.keys(byFileType).length,
      unique_patterns: Object.keys(pathPatterns).length,
      urls_with_parameters: Object.values(parameterAnalysis).reduce((sum, count) => sum + count, 0)
    }
  };
}

// Health Check
app.get('/', (req, res) => {
  res.json({ 
    status: 'running', 
    service: 'schema-api-complete',
    version: '2.0.0',
    features: [
      'Complete sitemap analysis with clustering',
      'Schema.org generation', 
      'Text tokenization',
      'Entity validation',
      'Existing schema extraction'
    ],
    endpoints: {
      'GET /': 'Health check',
      'POST /sitemap': 'Complete sitemap analysis with advanced URL clustering',
      'POST /extract': 'Text analysis and tokenization (supports Hebrew)',
      'POST /schema': 'Generate Schema.org markup from URL',
      'POST /validate-entity': 'Validate Schema.org entities',
      'POST /existing-schema': 'Extract existing structured data'
    }
  });
});

// 1. Enhanced Sitemap Analysis with Clustering
app.post('/sitemap', async (req, res) => {
  try {
    const { url, max_urls = 10000, deep_crawl = true, max_depth = 2 } = req.body;
    
    if (!url) return res.status(400).json({ 
      error: 'Missing url parameter',
      example: { 
        url: 'https://example.com/sitemap.xml', 
        max_urls: 10000,
        deep_crawl: true,
        max_depth: 2
      }
    });
    
    console.log(`Sitemap analysis: ${url}, max_urls: ${max_urls}, deep_crawl: ${deep_crawl}`);
    
    // Get URLs from sitemap (recursive)
    const urls = await getAllUrlsFromSitemap(url, max_depth, 0, max_urls);
    
    if (urls.length === 0) {
      return res.json({
        success: false,
        error: 'No URLs found in sitemap',
        url,
        total_urls: 0,
        suggestions: [
          'Check if sitemap URL is correct',
          'Try /sitemap.xml, /sitemap_index.xml, or /robots.txt',
          'Verify sitemap is publicly accessible'
        ]
      });
    }
    
    // Enhanced clustering analysis
    const clustering = analyzeUrlClustering(urls);
    
    res.json({
      success: true,
      url,
      extracted_at: new Date().toISOString(),
      
      // Sitemap data
      sitemap_data: {
        total_urls: urls.length,
        urls: urls,
        deep_crawl_used: deep_crawl,
        max_depth_reached: max_depth
      },
      
      // Clustering analysis
      clustering_analysis: clustering,
      
      // Quick stats
      stats: {
        url_count: urls.length,
        unique_main_categories: Object.keys(clustering.by_main_category).length,
        deepest_level: Math.max(...Object.keys(clustering.by_depth).map(k => parseInt(k.replace('depth_', '')))),
        most_common_category: Object.entries(clustering.by_main_category)
          .sort(([,a], [,b]) => b - a)[0]?.[0] || 'none'
      }
    });
    
  } catch (err) {
    console.error('Sitemap analysis error:', err.message);
    res.status(500).json({ 
      success: false,
      error: 'Sitemap analysis failed', 
      details: err.message,
      url: req.body.url || 'unknown'
    });
  }
});

// 2. Text Analysis with Hebrew Support
app.post('/extract', (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Missing text parameter' });
    
    const words = text.split(/\s+/).filter(w => w.length > 0);
    // Improved regex for Hebrew + English + numbers
    const tokens = text.match(/[\u0590-\u05FF\w\d]+/g) || [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Language detection
    const hebrewChars = (text.match(/[\u0590-\u05FF]/g) || []).length;
    const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
    let language = 'unknown';
    if (hebrewChars > englishChars) language = 'hebrew';
    else if (englishChars > hebrewChars) language = 'english';
    else if (hebrewChars > 0 || englishChars > 0) language = 'mixed';
    
    res.json({
      word_count: words.length,
      n_tokens: tokens.length,
      avg_token_length: tokens.length > 0 ? 
        Math.round(tokens.reduce((sum, t) => sum + t.length, 0) / tokens.length * 100) / 100 : 0,
      char_count: text.length,
      char_count_no_spaces: text.replace(/\s/g, '').length,
      sentence_count: sentences.length,
      language_detected: language,
      reading_time_minutes: Math.ceil(words.length / 200), // Average reading speed
      complexity_score: tokens.length > 0 ? 
        Math.round((tokens.reduce((sum, t) => sum + t.length, 0) / tokens.length) * 10) : 0
    });
    
  } catch (err) {
    res.status(500).json({ error: 'Text analysis failed', details: err.message });
  }
});

// 3. Schema.org Generation
app.post('/schema', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'Missing url parameter' });
    
    console.log('Schema generation for:', url);
    const response = await axios.get(url, { 
      timeout: 20000,
      headers: { 'User-Agent': 'Schema-API/2.0.0' }
    });
    
    const $ = cheerio.load(response.data);
    
    // Extract basic info
    const title = $('title').text().trim();
    const description = $('meta[name="description"]').attr('content') || '';
    const image = $('meta[property="og:image"]').attr('content') || 
                  $('meta[name="twitter:image"]').attr('content') || '';
    const author = $('meta[name="author"]').attr('content') || '';
    const publishedDate = $('meta[property="article:published_time"]').attr('content') || '';
    
    // Smart type detection
    let schemaType = 'WebPage';
    if ($('article, .post, .blog-post').length > 0) schemaType = 'Article';
    if ($('.product, [data-product], .woocommerce-product').length > 0) schemaType = 'Product';
    if ($('address, .contact, .about').length > 0) schemaType = 'Organization';
    if ($('.recipe, [itemtype*="Recipe"]').length > 0) schemaType = 'Recipe';
    if ($('.event, [itemtype*="Event"]').length > 0) schemaType = 'Event';
    
    // Build schema
    const schema = {
      '@context': 'https://schema.org',
      '@type': schemaType,
      url: url,
      name: title,
      description: description
    };
    
    // Add type-specific properties
    if (image) schema.image = image;
    
    if (schemaType === 'Article' && author) {
      schema.author = { '@type': 'Person', name: author };
      if (publishedDate) schema.datePublished = publishedDate;
    }
    
    if (schemaType === 'Organization') {
      const phone = $('[href^="tel:"]').first().attr('href')?.replace('tel:', '');
      const email = $('[href^="mailto:"]').first().attr('href')?.replace('mailto:', '');
      if (phone) schema.telephone = phone;
      if (email) schema.email = email;
    }
    
    // Content analysis
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    const words = bodyText.split(' ').filter(w => w.length > 0);
    const tokens = bodyText.match(/[\u0590-\u05FF\w\d]+/g) || [];
    
    // SEO analysis
    const headings = {
      h1: $('h1').length,
      h2: $('h2').length,
      h3: $('h3').length
    };
    
    const images = $('img').length;
    const imagesWithAlt = $('img[alt]').length;
    
    res.json({
      from_existing_schema: [schemaType],
      used_type: schemaType,
      schema: schema,
      extract: {
        word_count: words.length,
        n_tokens: tokens.length,
        avg_token_length: tokens.length > 0 ? 
          Math.round(tokens.reduce((s,t) => s + t.length, 0) / tokens.length * 100) / 100 : 0
      },
      seo_analysis: {
        title_length: title.length,
        description_length: description.length,
        has_meta_description: !!description,
        has_og_image: !!image,
        headings_structure: headings,
        images_total: images,
        images_with_alt: imagesWithAlt,
        alt_text_coverage: images > 0 ? Math.round((imagesWithAlt / images) * 100) : 0
      }
    });
    
  } catch (err) {
    console.error('Schema generation error:', err.message);
    res.status(500).json({ error: 'Schema generation failed', details: err.message });
  }
});

// 4. Entity Validation
app.post('/validate-entity', (req, res) => {
  try {
    const { type, properties } = req.body;
    const errors = [];
    const warnings = [];
    const suggestions = [];
    
    if (!type) errors.push('Missing entity type');
    if (!properties || typeof properties !== 'object') {
      errors.push('Missing or invalid properties');
    }
    
    if (errors.length > 0) {
      return res.status(400).json({ valid: false, errors });
    }
    
    // Validation rules by type
    const validationRules = {
      Organization: {
        required: ['name'],
        recommended: ['url', 'description', 'address', 'telephone']
      },
      Person: {
        required: ['name'],
        recommended: ['url', 'jobTitle', 'worksFor']
      },
      Product: {
        required: ['name'],
        recommended: ['description', 'image', 'offers', 'brand']
      },
      Article: {
        required: ['headline'],
        recommended: ['author', 'datePublished', 'image', 'description']
      },
      Event: {
        required: ['name', 'startDate'],
        recommended: ['location', 'description', 'organizer']
      }
    };
    
    const rules = validationRules[type];
    if (!rules) {
      warnings.push(`Unknown entity type: ${type}. Validation may be incomplete.`);
    } else {
      // Check required fields
      rules.required.forEach(field => {
        if (!properties[field]) {
          errors.push(`${type}.${field} is required`);
        }
      });
      
      // Check recommended fields
      rules.recommended.forEach(field => {
        if (!properties[field]) {
          warnings.push(`${type}.${field} is recommended for better SEO`);
          suggestions.push(`Add ${field} property to improve schema completeness`);
        }
      });
    }
    
    const isValid = errors.length === 0;
    const completeness = rules ? 
      ((rules.required.filter(f => properties[f]).length + 
        rules.recommended.filter(f => properties[f]).length) / 
       (rules.required.length + rules.recommended.length)) * 100 : 50;
    
    res.json({
      valid: isValid,
      type: type,
      properties: properties,
      errors: errors,
      warnings: warnings,
      suggestions: suggestions,
      completeness_score: Math.round(completeness),
      seo_score: isValid ? Math.max(0, 100 - (warnings.length * 5)) : 0
    });
    
  } catch (err) {
    res.status(500).json({ error: 'Validation failed', details: err.message });
  }
});

// 5. Existing Schema Extraction
app.post('/existing-schema', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'Missing url parameter' });
    
    console.log('Extracting existing schemas from:', url);
    const response = await axios.get(url, { 
      timeout: 20000,
      headers: { 'User-Agent': 'Schema-API/2.0.0' }
    });
    
    const $ = cheerio.load(response.data);
    const schemas = [];
    
    // Extract JSON-LD
    $('script[type="application/ld+json"]').each((i, elem) => {
      try {
        const content = $(elem).html().trim();
        const parsed = JSON.parse(content);
        schemas.push({
          type: 'json-ld',
          format: 'application/ld+json',
          data: parsed,
          schema_types: Array.isArray(parsed) ? 
            parsed.map(p => p['@type']).filter(Boolean) :
            [parsed['@type']].filter(Boolean)
        });
      } catch (e) {
        schemas.push({
          type: 'json-ld',
          format: 'application/ld+json',
          error: 'Invalid JSON-LD syntax',
          raw_content: $(elem).html().trim().substring(0, 200) + '...'
        });
      }
    });
    
    // Extract microdata
    const microdataItems = [];
    $('[itemscope]').each((i, elem) => {
      const $elem = $(elem);
      const itemType = $elem.attr('itemtype');
      const properties = {};
      
      $elem.find('[itemprop]').each((j, propElem) => {
        const propName = $(propElem).attr('itemprop');
        const propValue = $(propElem).attr('content') || $(propElem).text().trim();
        properties[propName] = propValue;
      });
      
      if (itemType) {
        microdataItems.push({
          type: 'microdata',
          itemtype: itemType,
          properties: properties
        });
      }
    });
    
    if (microdataItems.length > 0) {
      schemas.push({
        type: 'microdata',
        format: 'HTML microdata',
        data: microdataItems,
        schema_types: microdataItems.map(item => 
          item.itemtype?.split('/').pop()
        ).filter(Boolean)
      });
    }
    
    // Extract Open Graph
    const openGraph = {};
    $('meta[property^="og:"]').each((i, elem) => {
      const property = $(elem).attr('property');
      const content = $(elem).attr('content');
      if (property && content) {
        openGraph[property] = content;
      }
    });
    
    if (Object.keys(openGraph).length > 0) {
      schemas.push({
        type: 'open-graph',
        format: 'Open Graph meta tags',
        data: openGraph
      });
    }
    
    // Extract Twitter Cards
    const twitterCard = {};
    $('meta[name^="twitter:"]').each((i, elem) => {
      const name = $(elem).attr('name');
      const content = $(elem).attr('content');
      if (name && content) {
        twitterCard[name] = content;
      }
    });
    
    if (Object.keys(twitterCard).length > 0) {
      schemas.push({
        type: 'twitter-card',
        format: 'Twitter Card meta tags',
        data: twitterCard
      });
    }
    
    // Summary
    const allSchemaTypes = schemas
      .flatMap(s => s.schema_types || [])
      .filter(Boolean);
    
    res.json({
      success: true,
      url: url,
      schemas: schemas,
      summary: {
        total_schemas: schemas.length,
        has_json_ld: schemas.some(s => s.type === 'json-ld'),
        has_microdata: schemas.some(s => s.type === 'microdata'), 
        has_open_graph: schemas.some(s => s.type === 'open-graph'),
        has_twitter_cards: schemas.some(s => s.type === 'twitter-card'),
        schema_types_found: [...new Set(allSchemaTypes)],
        seo_completeness: Math.min(100, schemas.length * 25)
      }
    });
    
  } catch (err) {
    console.error('Schema extraction error:', err.message);
    res.status(500).json({ error: 'Schema extraction failed', details: err.message });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Complete Schema API v2.0 ready on port ${PORT}!`);
  console.log('📋 Features:');
  console.log('  ✅ Complete sitemap analysis with clustering');
  console.log('  ✅ Hebrew + English text analysis');
  console.log('  ✅ Smart Schema.org generation');
  console.log('  ✅ Comprehensive entity validation');
  console.log('  ✅ Multi-format schema extraction');
});
