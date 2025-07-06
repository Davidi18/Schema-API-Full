from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import advertools as adv
import asyncio
import aiohttp
import pandas as pd
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
        # תיקון: advertools לא יודע async sitemap, אז נעשה זאת ידנית
        async with aiohttp.ClientSession() as session:
            async with session.get(req.url) as response:
                if response.status != 200:
                    raise HTTPException(400, f"Failed to fetch sitemap: {response.status}")
                
                content = await response.text()
                
        # עיבוד הsitemap
        from xml.etree import ElementTree as ET
        root = ET.fromstring(content)
        
        urls = []
        # נסה גם sitemap index וגם urlset
        for url_elem in root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc'):
            if len(urls) >= req.max_urls:
                break
            urls.append(url_elem.text)
            
        return {
            "success": True,
            "urls": urls,
            "count": len(urls),
            "requested_max": req.max_urls
        }
        
    except ET.ParseError as e:
        raise HTTPException(400, f"Invalid XML sitemap: {str(e)}")
    except Exception as e:
        raise HTTPException(500, f"Sitemap processing error: {str(e)}")

@app.post("/extract")
async def extract(req: ExtractRequest):
    try:
        # תיקון: advertools לא יודע tokenize, נעשה זאת ידנית
        text = req.text.strip()
        words = text.split()
        
        # טוקניזציה פשוטה
        import re
        tokens = re.findall(r'\b\w+\b', text.lower())
        
        return {
            "word_count": len(words),
            "n_tokens": len(tokens),
            "avg_token_length": round(sum(len(t) for t in tokens) / len(tokens), 2) if tokens else 0,
            "char_count": len(text),
            "sentence_count": len(re.split(r'[.!?]+', text))
        }
        
    except Exception as e:
        raise HTTPException(500, f"Text analysis error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
