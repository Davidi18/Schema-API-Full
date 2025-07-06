# 🧭 Schema API Full

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-green.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**Advanced SEO & Website Structure Analysis API** - Comprehensive sitemap analysis, URL clustering, and schema generation for SEO professionals.

---

## 🌟 Overview

Schema API Full provides deep insights into website structure and SEO optimization opportunities. Built for SEO agencies, developers, and marketing professionals who need reliable website analysis tools.

### 🎯 **Core Features**
- **🗂️ Unlimited Sitemap Analysis** - Extract and analyze all URLs from XML sitemaps
- **📊 Intelligent URL Clustering** - Categorize website architecture and identify issues
- **🔍 Schema Generation** - AI-powered JSON-LD structured data creation
- **🌐 Site Crawling** - Integration with Crawl4AI for content extraction
- **📈 SEO Insights** - Identify tag spam, thin content, and optimization opportunities

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- Docker (recommended)
- Port 3010 available

### Docker Deployment
```bash
# Using existing service
curl -X GET http://localhost:3010/
# Should return: {"status": "running"}
```

### Authentication
All endpoints require Bearer token authentication:
```bash
Authorization: Bearer strudel123
```

---

## 📡 API Endpoints

### 🏥 Health Check

```bash
GET /
```

**Response**:
```json
{
  "status": "running"
}
```

---

### 🗂️ Sitemap Analysis

```bash
POST /sitemap
```

**Description**: Extract and analyze URLs from XML sitemaps with support for large sites.

**Request Body**:
```json
{
  "url": "https://example.com/sitemap.xml",
  "max_urls": 2000
}
```

**Parameters**:
- **`url`** *(required)* - Sitemap URL (XML format)
- **`max_urls`** *(optional)* - Maximum URLs to extract (tested up to 2000+)

**Response**:
```json
{
  "urls": [
    "https://example.com/",
    "https://example.com/about",
    "https://example.com/products/item1"
  ],
  "count": 543,
  "total_found": 543,
  "deep_crawl_used": true,
  "max_depth_reached": 2
}
```

**Example**:
```bash
curl -X POST http://localhost:3010/sitemap \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer strudel123" \
  -d '{
    "url": "https://example.com/sitemap.xml",
    "max_urls": 2000
  }'
```

---

### 🗂️ URL Clustering Analysis

```bash
POST /cluster
```

**Description**: Intelligent categorization of website URLs to identify SEO issues and content patterns.

**Request Body**:
```json
{
  "url": "https://example.com/sitemap.xml",
  "level": 2,
  "max_urls": 2000
}
```

**Parameters**:
- **`url`** *(required)* - Sitemap URL to analyze
- **`level`** *(required)* - Clustering depth (1-4)
  - `1`: Top-level directories (`/blog`, `/products`)
  - `2`: Sub-directories (`/blog/2024`, `/products/electronics`)
  - `3`: Deeper structure (`/blog/2024/march`)
  - `4`: Maximum granular analysis
- **`max_urls`** *(optional)* - URLs to analyze (default: 100, tested up to 2000+)

**Response**:
```json
{
  "cluster_by": "dir_2",
  "clusters": {
    "tag": 143,
    "product": 15,
    "offer": 13,
    "order-confirmed": 10,
    "category": 3,
    "blog": 1
  }
}
```

**SEO Insights**:
- **Tag Spam Detection**: High tag counts indicate potential thin content
- **Content Imbalance**: Tag pages outnumbering actual content
- **Architecture Issues**: Poorly organized URL structure

**Example**:
```bash
curl -X POST http://localhost:3010/cluster \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer strudel123" \
  -d '{
    "url": "https://example.com/sitemap.xml",
    "level": 2,
    "max_urls": 2000
  }'
```

---

### 🔍 Schema Generation

```bash
POST /schema
```

**Description**: Generate JSON-LD structured data based on page content analysis.

**Request Body**:
```json
{
  "url": "https://example.com/product/amazing-widget"
}
```

**Response**:
```json
{
  "from_existing_schema": ["WebPage"],
  "used_type": "WebPage",
  "schema": {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "url": "https://example.com/product/amazing-widget",
    "name": "Amazing Widget",
    "description": "Product description"
  },
  "extract": {
    "word_count": 150,
    "n_tokens": 170,
    "avg_token_length": 4.5
  }
}
```

---

### 🌐 Site Crawling Integration

```bash
POST /crawl-site
```

**Description**: Deep site analysis using Crawl4AI integration.

**Request Body**:
```json
{
  "url": "https://example.com"
}
```

**Response**:
```json
{
  "url": "https://example.com",
  "title": "Home Page",
  "schemas": [...],
  "markdown": "...",
  "text": "...",
  "screenshot_url": null
}
```

---

### 📊 Additional Endpoints

#### NLP Text Analysis
```bash
POST /extract
```

#### Entity Validation
```bash
POST /validate-entity
```

#### Batch Analysis
```bash
POST /batch-analyze
```

#### Entity Report
```bash
POST /entity-report
```

#### Coverage Report
```bash
POST /coverage-report
```

#### Existing Schema Extraction
```bash
GET /existing-schema?url=https://example.com
```

---

## 💡 Use Cases

### 🏢 **SEO Agencies**

**Client Site Audit**:
```bash
# 1. Get full sitemap
curl -X POST http://localhost:3010/sitemap \
  -H "Authorization: Bearer strudel123" \
  -d '{"url": "https://client.com/sitemap.xml", "max_urls": 2000}'

# 2. Analyze structure
curl -X POST http://localhost:3010/cluster \
  -H "Authorization: Bearer strudel123" \
  -d '{"url": "https://client.com/sitemap.xml", "level": 2}'
```

**Common Issues Detected**:
- Tag spam (excessive tag pages)
- Thin content areas
- Poor URL architecture
- Missing schema markup

### 🛍️ **E-commerce Sites**

**Product Structure Analysis**:
```bash
curl -X POST http://localhost:3010/cluster \
  -H "Authorization: Bearer strudel123" \
  -d '{
    "url": "https://shop.com/sitemap.xml",
    "level": 3,
    "max_urls": 2000
  }'
```

**Expected Clusters**:
- Products by category
- Product variants
- Collection pages
- Tag/filter pages

### 📰 **Content Sites**

**Content Distribution Analysis**:
```bash
curl -X POST http://localhost:3010/cluster \
  -H "Authorization: Bearer strudel123" \
  -d '{
    "url": "https://blog.com/sitemap.xml",
    "level": 2
  }'
```

**Insights**:
- Content volume by category
- Date-based organization
- Author/tag distribution

---

## 🔧 Configuration

### Environment Variables
```env
PORT=3010
AUTH_TOKEN=strudel123
NODE_ENV=production
```

### Rate Limiting
- Default: 60 requests per minute
- Burst: Up to 120 requests
- Large operations may take 30+ seconds

### Performance
- **Sitemap Analysis**: 2-10 seconds (depending on size)
- **Clustering**: 5-30 seconds (based on URL count)
- **Schema Generation**: 3-8 seconds per page
- **Site Crawling**: 1-2 minutes (depends on page count)

---

## 🧪 Testing

### Basic Health Check
```bash
curl -X GET http://localhost:3010/
```

### Full Workflow Test
```bash
#!/bin/bash
echo "Testing Schema API Full..."

# 1. Health check
curl -s http://localhost:3010/ | jq '.'

# 2. Sitemap analysis
curl -s -X POST http://localhost:3010/sitemap \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer strudel123" \
  -d '{"url": "https://example.com/sitemap.xml"}' | jq '.count'

# 3. Clustering analysis
curl -s -X POST http://localhost:3010/cluster \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer strudel123" \
  -d '{"url": "https://example.com/sitemap.xml", "level": 1}' | jq '.clusters'

echo "✅ All tests completed"
```

---

## 🔒 Security

### Authentication
- Bearer token required for all endpoints
- Token: `strudel123`
- Include in Authorization header

### Input Validation
- URL validation for sitemap endpoints
- Parameter range checking
- JSON schema validation

### Rate Limiting
- Per-IP rate limiting
- Request size limits
- Timeout protection

---

## 🐛 Error Handling

### Common Errors

| Code | Description | Solution |
|------|-------------|----------|
| **400** | Bad Request | Check request format and parameters |
| **401** | Unauthorized | Verify Authorization header |
| **429** | Rate Limited | Reduce request frequency |
| **500** | Server Error | Check server logs |
| **503** | Service Unavailable | Retry after delay |

### Error Response Format
```json
{
  "error": "URL is required",
  "status": 400
}
```

---

## 📈 Performance Tips

### Optimizing Large Sites
1. **Start Small**: Test with smaller max_urls first
2. **Use Appropriate Level**: Higher clustering levels take longer
3. **Monitor Timeouts**: Large operations may timeout
4. **Batch Processing**: Split very large sites into chunks

### Best Practices
```bash
# Good: Start with overview
curl -X POST http://localhost:3010/cluster \
  -d '{"url": "https://large-site.com/sitemap.xml", "level": 1, "max_urls": 500}'

# Then: Drill down if needed
curl -X POST http://localhost:3010/cluster \
  -d '{"url": "https://large-site.com/sitemap.xml", "level": 2, "max_urls": 1000}'
```

---

## 🔮 Integration Examples

### Python Script
```python
import requests

def analyze_website(sitemap_url):
    headers = {'Authorization': 'Bearer strudel123'}
    
    # Get sitemap data
    sitemap_response = requests.post(
        'http://localhost:3010/sitemap',
        headers=headers,
        json={'url': sitemap_url, 'max_urls': 2000}
    )
    
    # Analyze clustering
    cluster_response = requests.post(
        'http://localhost:3010/cluster',
        headers=headers,
        json={'url': sitemap_url, 'level': 2}
    )
    
    return {
        'total_pages': sitemap_response.json()['count'],
        'structure': cluster_response.json()['clusters']
    }

# Usage
result = analyze_website('https://example.com/sitemap.xml')
print(f"Total pages: {result['total_pages']}")
print(f"Structure: {result['structure']}")
```

### Node.js Integration
```javascript
const axios = require('axios');

const api = axios.create({
    baseURL: 'http://localhost:3010',
    headers: {
        'Authorization': 'Bearer strudel123',
        'Content-Type': 'application/json'
    }
});

async function analyzeWebsite(sitemapUrl) {
    try {
        // Get sitemap
        const sitemap = await api.post('/sitemap', {
            url: sitemapUrl,
            max_urls: 2000
        });
        
        // Analyze structure
        const clustering = await api.post('/cluster', {
            url: sitemapUrl,
            level: 2
        });
        
        return {
            totalPages: sitemap.data.count,
            clusters: clustering.data.clusters
        };
    } catch (error) {
        console.error('Analysis failed:', error.message);
        throw error;
    }
}

// Usage
analyzeWebsite('https://example.com/sitemap.xml')
    .then(result => console.log(result))
    .catch(error => console.error(error));
```

---

## 🆘 Support

- 📧 **Email**: support@strudel.marketing
- 🐛 **Issues**: Report technical issues
- 📚 **Documentation**: This README covers main functionality

---

## 🔄 Changelog

### Current Version (1.0.0)
- ✅ Unlimited sitemap analysis (tested with 2000+ URLs)
- ✅ Multi-level URL clustering
- ✅ Deep crawl support for sitemap indexes
- ✅ Schema generation and validation
- ✅ Crawl4AI integration
- ✅ Bearer token authentication

### Known Limitations
- Large operations may timeout (30+ seconds)
- Rate limiting applies to frequent requests
- Memory usage scales with URL count

---

**🚀 Ready to analyze your website structure? Start with a simple sitemap analysis and discover optimization opportunities!**

*Built for professional SEO analysis • Supports sites of any size • Deployed and ready to use*
