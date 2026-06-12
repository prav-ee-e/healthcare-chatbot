"""
Healthcare AI Chatbot - FastAPI Backend
Powered by Groq API (Free Tier) - Ultra fast inference
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from groq import Groq
import json
import os
from dotenv import load_dotenv

# Auto-load .env file
load_dotenv()

# ── App Setup ──────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Healthcare AI Chatbot API",
    description="AI-powered healthcare assistant backed by Groq",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Groq Client Setup ───────────────────────────────────────────────────────────
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY not found. Please set it in backend/.env")

client = Groq(api_key=GROQ_API_KEY)
MODEL = "llama-3.3-70b-versatile"  # Free, fast, very capable

# ── System Prompt ───────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are MediAssist, a compassionate and knowledgeable AI healthcare assistant.
Your role is to provide clear, accurate, and helpful health information while always prioritizing patient safety.

## Your Capabilities:
- Explain medical conditions, symptoms, and treatments in plain language
- Guide users through general wellness and preventive health topics
- Help users understand medications and potential interactions (general info only)
- Provide mental health support and coping strategies
- Explain lab results, medical terminology, and procedures
- Recommend when to seek professional medical care

## Critical Guidelines:
1. Always recommend professional consultation for diagnosis, prescriptions, or serious symptoms
2. Never diagnose specific conditions — provide general information only
3. Emergency signals: If someone describes chest pain, difficulty breathing, stroke symptoms,
   suicidal ideation, or other emergencies, immediately direct them to call emergency services
4. Tone: Be warm, empathetic, and non-judgmental
5. Evidence-based: Rely on established medical consensus (WHO, CDC, NIH guidelines)

## Response Style:
- Use clear, jargon-free language
- Structure longer responses with bullet points or numbered steps
- End with a relevant safety reminder when appropriate

Remember: You are a trusted health companion, not a replacement for a qualified healthcare professional."""

# ── Schemas ─────────────────────────────────────────────────────────────────────
class Message(BaseModel):
    role: str        # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    stream: Optional[bool] = False

class ChatResponse(BaseModel):
    reply: str
    tokens_used: Optional[int] = None

class HealthCheckResponse(BaseModel):
    status: str
    version: str


# ── Routes ───────────────────────────────────────────────────────────────────────

@app.get("/", response_model=HealthCheckResponse)
async def root():
    return {"status": "healthy", "version": "1.0.0"}


@app.get("/health", response_model=HealthCheckResponse)
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Non-streaming chat endpoint."""
    if not request.messages:
        raise HTTPException(status_code=400, detail="No messages provided")

    try:
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        messages += [{"role": m.role, "content": m.content} for m in request.messages]

        response = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            max_tokens=1024,
            temperature=0.7,
        )

        reply = response.choices[0].message.content or ""
        tokens_used = response.usage.total_tokens if response.usage else None
        return ChatResponse(reply=reply, tokens_used=tokens_used)

    except Exception as e:
        err = str(e)
        if "401" in err or "auth" in err.lower() or "api key" in err.lower():
            raise HTTPException(status_code=401, detail="Invalid Groq API key. Check GROQ_API_KEY in .env")
        if "429" in err or "rate" in err.lower():
            raise HTTPException(status_code=429, detail="Rate limit reached. Please wait a moment.")
        raise HTTPException(status_code=500, detail=f"AI error: {err}")


@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """Streaming chat via Server-Sent Events."""
    if not request.messages:
        raise HTTPException(status_code=400, detail="No messages provided")

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages += [{"role": m.role, "content": m.content} for m in request.messages]

    def generate():
        try:
            stream = client.chat.completions.create(
                model=MODEL,
                messages=messages,
                max_tokens=1024,
                temperature=0.7,
                stream=True,
            )
            for chunk in stream:
                text = chunk.choices[0].delta.content
                if text:
                    yield f"data: {json.dumps({'chunk': text})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/topics")
async def get_health_topics():
    return {
        "topics": [
            {"id": "symptoms",    "label": "Symptom Checker",   "icon": "🔍"},
            {"id": "medications", "label": "Medications",        "icon": "💊"},
            {"id": "mental",      "label": "Mental Health",      "icon": "🧠"},
            {"id": "nutrition",   "label": "Nutrition & Diet",   "icon": "🥗"},
            {"id": "fitness",     "label": "Fitness & Exercise", "icon": "🏃"},
            {"id": "chronic",     "label": "Chronic Conditions", "icon": "📋"},
            {"id": "preventive",  "label": "Preventive Care",    "icon": "🛡️"},
            {"id": "emergency",   "label": "Emergency Guide",    "icon": "🚨"},
        ]
    }