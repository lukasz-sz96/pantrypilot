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

COOKLANG_PROMPT = """Convert this recipe to Cooklang format.

Rules:
- Use @ingredient{{quantity%unit}} for ingredients (e.g., @flour{{2%cups}})
- Use @ingredient{{quantity}} if no unit (e.g., @eggs{{3}})
- Use @ingredient{{}} if no quantity
- Use #cookware{{}} for equipment
- Use ~timer{{time%unit}} for timers
- Add metadata at top with --- delimiters (title, servings, etc.)
- Keep steps as plain text with inline ingredient/cookware/timer references
- Only include actual pantry ingredients that need to be purchased/tracked
- Do NOT include: water, ice, pasta water, cooking water, or other non-purchasable items
- Simplify ingredient names (e.g., "guanciale" not "guanciale (pancetta or bacon)")

Recipe:
{recipe_text}

Return ONLY the Cooklang formatted recipe, no explanations."""

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
            },
            timeout=60,
        )

        if response.status_code != 200:
            raise HTTPException(status_code=500, detail=f"OpenRouter error: {response.text}")

        data = response.json()
        return data["choices"][0]["message"]["content"]


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


@app.post("/import/url", response_model=ImportResponse)
async def import_from_url(request: ImportFromUrlRequest):
    if request.provider == "openrouter" or (OPENROUTER_API_KEY and not request.provider):
        html = await fetch_recipe_text(request.url)
        cooklang = await convert_with_openrouter(html)
        return ImportResponse(cooklang=cooklang, title=extract_title(cooklang))

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
