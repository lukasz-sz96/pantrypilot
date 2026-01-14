import subprocess
import os
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

app = FastAPI(title="Cooklang Import Service")

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.environ.get("OPENROUTER_MODEL", "anthropic/claude-3.5-sonnet")

COOKLANG_PROMPT = """Convert this recipe to Cooklang format. Output ONLY raw Cooklang, no markdown code blocks.

Rules:
- Start with metadata block using --- delimiters (title, servings)
- Each step is a separate paragraph with inline ingredients
- Use @ingredient{{quantity%unit}} for ingredients (e.g., @flour{{2%cups}})
- Use @ingredient{{quantity}} if no unit (e.g., @eggs{{3}})
- Use @ingredient{{}} if no quantity
- Use #cookware{{}} for equipment
- Use ~{{time%unit}} for timers
- Do NOT list ingredients separately - they must be inline within steps
- Do NOT include: water, ice, pasta water, or non-purchasable items

Example format:
---
title: Pasta
servings: 4
---

Boil @pasta{{400%g}} in salted water for ~{{10%minutes}}.

Heat @olive oil{{2%tbsp}} in a #pan.

Recipe to convert:
{recipe_text}

Output raw Cooklang only, no markdown, no code blocks, no explanations."""

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ImportFromUrlRequest(BaseModel):
    url: str
    provider: Optional[str] = None


class ImportFromTextRequest(BaseModel):
    text: str
    title: Optional[str] = None
    provider: Optional[str] = None


class ImportResponse(BaseModel):
    cooklang: str
    title: Optional[str] = None
    image: Optional[str] = None
    servings: Optional[int] = None


def strip_markdown_code_blocks(text: str) -> str:
    import re
    text = re.sub(r'^```\w*\n?', '', text.strip())
    text = re.sub(r'\n?```$', '', text.strip())
    return text.strip()


async def convert_with_openrouter(recipe_text: str) -> str:
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY not configured")

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": OPENROUTER_MODEL,
                "messages": [
                    {"role": "user", "content": COOKLANG_PROMPT.format(recipe_text=recipe_text)}
                ],
                "max_tokens": 4000,
            },
            timeout=60,
        )

        if response.status_code != 200:
            raise HTTPException(status_code=500, detail=f"OpenRouter error: {response.text}")

        data = response.json()
        content = data["choices"][0]["message"]["content"]
        return strip_markdown_code_blocks(content)


async def fetch_recipe_text(url: str) -> str:
    async with httpx.AsyncClient() as client:
        response = await client.get(
            url,
            headers={"User-Agent": "Mozilla/5.0 (compatible; PantryPilot/1.0)"},
            follow_redirects=True,
            timeout=30,
        )
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {response.status_code}")
        return response.text


def run_cooklang_import(args: list[str]) -> str:
    try:
        result = subprocess.run(
            ["cooklang-import"] + args,
            capture_output=True,
            text=True,
            timeout=60,
        )

        if result.returncode != 0:
            error_msg = result.stderr or result.stdout or "Unknown error"
            raise HTTPException(status_code=500, detail=f"Import failed: {error_msg}")

        return result.stdout
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Import timed out")
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="cooklang-import binary not found")


@app.get("/health")
def health_check():
    return {"status": "healthy"}


def extract_title(cooklang: str) -> Optional[str]:
    for line in cooklang.split("\n"):
        if line.startswith(">> title:") or line.startswith("title:"):
            return line.split(":", 1)[1].strip()
    return None


def extract_recipe_metadata(html: str) -> dict:
    import re
    import json

    metadata = {"image": None, "servings": None}

    json_ld_matches = re.findall(
        r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>([\s\S]*?)</script>',
        html, re.IGNORECASE
    )

    for match in json_ld_matches:
        try:
            data = json.loads(match)
            all_items = []
            id_map = {}

            if isinstance(data, list):
                all_items = data
            elif isinstance(data, dict):
                if data.get("@graph"):
                    all_items = data["@graph"]
                else:
                    all_items = [data]

            for item in all_items:
                if item.get("@id"):
                    id_map[item["@id"]] = item

            for item in all_items:
                item_types = item.get("@type", [])
                if isinstance(item_types, str):
                    item_types = [item_types]

                if "Recipe" in item_types:
                    if item.get("image"):
                        img = item["image"]
                        if isinstance(img, list):
                            img = img[0] if img else None
                        if isinstance(img, dict):
                            if img.get("@id") and img["@id"] in id_map:
                                resolved = id_map[img["@id"]]
                                metadata["image"] = resolved.get("url") or resolved.get("contentUrl")
                            else:
                                metadata["image"] = img.get("url") or img.get("contentUrl")
                        elif isinstance(img, str):
                            metadata["image"] = img

                    if item.get("recipeYield"):
                        yield_val = item["recipeYield"]
                        if isinstance(yield_val, list):
                            yield_val = yield_val[0]
                        try:
                            servings = int(re.search(r'\d+', str(yield_val)).group())
                            metadata["servings"] = servings
                        except:
                            pass
                    break
        except:
            continue

    if not metadata["image"]:
        og_match = re.search(r'<meta[^>]*property=["\']og:image["\'][^>]*content=["\']([^"\']+)["\']', html, re.IGNORECASE)
        if not og_match:
            og_match = re.search(r'<meta[^>]*content=["\']([^"\']+)["\'][^>]*property=["\']og:image["\']', html, re.IGNORECASE)
        if og_match:
            metadata["image"] = og_match.group(1)

    return metadata


@app.post("/import/url", response_model=ImportResponse)
async def import_from_url(request: ImportFromUrlRequest):
    if request.provider == "openrouter" or (OPENROUTER_API_KEY and not request.provider):
        html = await fetch_recipe_text(request.url)
        cooklang = await convert_with_openrouter(html)
        metadata = extract_recipe_metadata(html)
        return ImportResponse(
            cooklang=cooklang,
            title=extract_title(cooklang),
            image=metadata.get("image"),
            servings=metadata.get("servings"),
        )

    args = [request.url]
    if request.provider:
        args = ["--provider", request.provider] + args

    cooklang = run_cooklang_import(args)
    return ImportResponse(cooklang=cooklang, title=extract_title(cooklang))


@app.post("/import/text", response_model=ImportResponse)
async def import_from_text(request: ImportFromTextRequest):
    if request.provider == "openrouter" or (OPENROUTER_API_KEY and not request.provider):
        cooklang = await convert_with_openrouter(request.text)
        return ImportResponse(cooklang=cooklang, title=request.title or extract_title(cooklang))

    args = ["--text", request.text]
    if request.provider:
        args = ["--provider", request.provider] + args

    cooklang = run_cooklang_import(args)
    return ImportResponse(cooklang=cooklang, title=request.title or extract_title(cooklang))


@app.get("/providers")
def list_providers():
    providers = []
    if OPENROUTER_API_KEY:
        providers.append("openrouter")
    if os.environ.get("OPENAI_API_KEY"):
        providers.append("openai")
    if os.environ.get("ANTHROPIC_API_KEY"):
        providers.append("anthropic")
    if os.environ.get("GEMINI_API_KEY"):
        providers.append("gemini")
    if os.environ.get("AZURE_OPENAI_API_KEY"):
        providers.append("azure")
    providers.append("ollama")
    return {"providers": providers}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
