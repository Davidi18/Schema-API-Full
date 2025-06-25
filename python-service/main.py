from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import advertools as adv

app = FastAPI()

class SitemapRequest(BaseModel):
    url: str
    max_urls: int = 100

@app.post("/sitemap")
async def sitemap(req: SitemapRequest):
    try:
        df = await adv.sitemap_to_df_async(req.url)
        return {"urls": df['loc'].head(req.max_urls).tolist()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ExtractRequest(BaseModel):
    text: str

@app.post("/extract")
async def extract(req: ExtractRequest):
    try:
        tokens = adv.tokenize(req.text)
        return {"word_count": len(req.text.split()), "n_tokens": len(tokens), "avg_token_length": round(sum(len(t) for t in tokens)/len(tokens),2) if tokens else 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
