
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import aiohttp
import xml.etree.ElementTree as ET
import re
from typing import List

app = FastAPI(title="Schema API Python Service", version="1.0.0")

# הוספת CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class SitemapRequest(BaseModel):
    url: str
    max_urls: int = 100

class ExtractRequest(BaseModel):
    text: str

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "python-nlp"}

@app.post("/sitemap")
async def sitemap(req: SitemapRequest):
    try:
        # משיכת sitemap עם aiohttp (תחליף ל-advertools async שלא קיים)
        async with aiohttp.ClientSession() as session:
            async with session.get(req.url, timeout=30) as response:
                if response.status != 200:
                    raise HTTPException(400, f"Failed to fetch sitemap: HTTP {response.status}")
                
                content = await response.text()
        
        # עיבוד XML
        try:
            root = ET.fromstring(content)
        except ET.ParseError as e:
            raise HTTPException(400, f"Invalid XML sitemap: {str(e)}")
        
        urls = []
        
        # תמיכה בsitemap index ו-urlset רגיל
        namespaces = {
            'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9'
        }
        
        # נסה sitemap index קודם
        sitemap_locs = root.findall('.//sm:sitemap/sm:loc', namespaces)
        if sitemap_locs:
            # זה sitemap index - קח את הsitemaps הפנימיים
            for loc in sitemap_locs[:req.max_urls]:
                urls.append(loc.text)
        else:
            # זה urlset רגיל - קח את הURLs
            url_locs = root.findall('.//sm:url/sm:loc', namespaces)
            for loc in url_locs[:req.max_urls]:
                if loc.text:
                    urls.append(loc.text)
        
        return {
            "success": True,
            "urls": urls,
            "count": len(urls),
            "requested_max": req.max_urls,
            "type": "sitemap_index" if sitemap_locs else "urlset"
        }
        
    except aiohttp.ClientError as e:
        raise HTTPException(500, f"Network error: {str(e)}")
    except Exception as e:
        raise HTTPException(500, f"Sitemap processing error: {str(e)}")

@app.post("/extract")
async def extract(req: ExtractRequest):
    try:
        text = req.text.strip()
        
        if not text:
            return {
                "word_count": 0,
                "n_tokens": 0,
                "avg_token_length": 0,
                "char_count": 0,
                "sentence_count": 0
            }
        
        # ניתוח בסיסי של טקסט (תחליף ל-advertools.tokenize שלא קיים)
        words = text.split()
        
        # טוקניזציה פשוטה - רק מילים
        tokens = re.findall(r'\b\w+\b', text.lower())
        
        # ספירת משפטים
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        return {
            "word_count": len(words),
            "n_tokens": len(tokens),
            "avg_token_length": round(sum(len(t) for t in tokens) / len(tokens), 2) if tokens else 0,
            "char_count": len(text),
            "sentence_count": len(sentences),
            "language_detected": "unknown"  # ניתן להוסיף זיהוי שפה בעתיד
        }
        
    except Exception as e:
        raise HTTPException(500, f"Text analysis error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
