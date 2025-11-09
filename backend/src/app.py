import os
from typing import Any, Dict, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from .parser import parse_command

# Optional OpenAI use. Works only if OPENAI_API_KEY is set.
USE_AI = bool(os.getenv("OPENAI_API_KEY"))

# If you have the 2024+ OpenAI SDK:
try:
    if USE_AI:
        from openai import OpenAI
        oai_client = OpenAI()
except Exception:
    USE_AI = False

app = FastAPI(title="Beat Agent API")

# Adjust for your Vite dev host/port
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class CommandIn(BaseModel):
    text: str

class PlanOut(BaseModel):
    plan: Dict[str, Any]
    source: str  # "ai" or "rules"

def ai_plan_from_text(text: str) -> Dict[str, Any]:
    """
    Ask the model to emit strict JSON. We validate client-side too.
    """
    prompt = f"""
You are a music command interpreter. Convert the user's instruction into a STRICT JSON object called plan.

Allowed shapes:
- {{"type":"add","instrument":"808|kick|snare|hihat|clap|bass|piano|pad","pattern": "optional string"}}
- {{"type":"remove","instrument":"..." }}
- {{"type":"mute","instrument":"..." }}
- {{"type":"unmute","instrument":"..." }}
- {{"type":"tempo:set","bpm": integer 40..220}}
- {{"type":"tempo:delta","delta": integer -50..50}}
- {{"type":"key:set","key":"C|G|A minor|E minor"}}
- {{"type":"swing:set","percent": integer 50..65}}

User: {text}
Return ONLY the JSON object, no commentary.
"""
    # If you’re on the newer Responses API:
    try:
        resp = oai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role":"user","content": prompt}],
            temperature=0
        )
        raw = resp.choices[0].message.content.strip()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI error: {e}")

    # Best-effort JSON parse without eval
    import json
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # If model returns code fences, try to strip them
        raw = raw.replace("```json","").replace("```","").strip()
        return json.loads(raw)

@app.post("/api/command", response_model=PlanOut)
def command(incoming: CommandIn):
    text = incoming.text or ""
    if USE_AI:
        plan = ai_plan_from_text(text)
        return {"plan": plan, "source": "ai"}
    # fallback rules
    plan = parse_command(text)
    return {"plan": plan, "source": "rules"}
