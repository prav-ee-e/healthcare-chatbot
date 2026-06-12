# MediAssist — Healthcare AI Chatbot

A full-stack, production-ready AI healthcare chatbot built with **React + Vite** (frontend) and **Python + FastAPI** (backend), powered by the **Anthropic Claude API**. Features real-time streaming responses, multi-session chat history, topic quick-access, and a clean clinical UI.

---

## ✨ Features

| Feature | Detail |
|---|---|
| 🤖 AI-powered responses | Claude claude-sonnet-4-20250514 with a healthcare-tuned system prompt |
| ⚡ Streaming replies | Server-Sent Events (SSE) for real-time token streaming |
| 💬 Multi-session history | Create, switch between, and delete conversations |
| 🏥 Health topic shortcuts | One-click topic starters (Symptoms, Medications, Mental Health, etc.) |
| 📱 Responsive UI | Works on desktop and mobile |
| 🐳 Docker ready | Single `docker-compose up` to run everything |
| 🔒 Safety guardrails | Emergency detection, professional consultation reminders |

---

## 🗂 Project Structure

```
healthcare-chatbot/
├── backend/
│   ├── main.py              # FastAPI app — /chat, /chat/stream, /topics
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx         # React entry point
│   │   ├── App.jsx          # Main chatbot component
│   │   ├── App.css          # Component styles
│   │   └── index.css        # Global styles + markdown rendering
│   ├── index.html
│   ├── vite.config.js       # Vite config with /api proxy
│   ├── package.json
│   ├── Dockerfile
│   └── nginx.conf           # Production reverse proxy config
│
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## 🚀 Quick Start

### Option A — Docker (recommended)

**Prerequisites:** Docker + Docker Compose installed.

```bash
# 1. Clone / download the project
cd healthcare-chatbot

# 2. Create your .env file
cp .env.example .env
# Edit .env and set your ANTHROPIC_API_KEY

# 3. Build and run
docker-compose up --build

# App is now available at:
#   Frontend → http://localhost:80
#   Backend  → http://localhost:8000
```

---

### Option B — Local Development (no Docker)

#### Backend

```bash
cd backend

# Create a virtual environment
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set your API key
cp .env.example .env
# Edit .env: ANTHROPIC_API_KEY=sk-ant-...

# Start the server (with auto-reload)
uvicorn main:app --reload --port 8000
```

Backend docs available at: **http://localhost:8000/docs**

#### Frontend

```bash
cd frontend

# Install Node dependencies
npm install

# Start Vite dev server (proxies /api → localhost:8000)
npm run dev
```

Frontend available at: **http://localhost:3000**

---

## 🔌 API Reference

All endpoints are served from the FastAPI backend at `http://localhost:8000`.

### `GET /health`
Health check.

```json
{ "status": "healthy", "version": "1.0.0" }
```

---

### `POST /chat`
Non-streaming chat. Returns the full reply once complete.

**Request body:**
```json
{
  "messages": [
    { "role": "user", "content": "What are symptoms of dehydration?" }
  ]
}
```

**Response:**
```json
{
  "reply": "Common symptoms of dehydration include...",
  "tokens_used": 312
}
```

---

### `POST /chat/stream`
Streaming chat via Server-Sent Events (SSE).

**Request body:** Same as `/chat`.

**Response stream (SSE):**
```
data: {"chunk": "Common"}
data: {"chunk": " symptoms"}
data: {"chunk": " of dehydration..."}
data: [DONE]
```

---

### `GET /topics`
Returns health topic categories for the UI.

```json
{
  "topics": [
    { "id": "symptoms", "label": "Symptom Checker", "icon": "🔍" },
    ...
  ]
}
```

---

## ⚙️ Configuration

| Variable | Where | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | `backend/.env` or root `.env` | Your Anthropic API key (required) |

Get your API key at [console.anthropic.com](https://console.anthropic.com).

---

## 🧠 Customising the AI Persona

The system prompt lives in `backend/main.py` → `SYSTEM_PROMPT`. Edit it to:

- Change the assistant name or persona
- Add specific medical guidelines or disclaimers
- Restrict to a speciality (e.g. paediatrics, oncology)
- Change the language / locale

---

## 🛡️ Safety & Disclaimers

- The chatbot **never diagnoses** conditions
- All responses include a reminder to consult a qualified doctor
- Emergency symptoms (chest pain, stroke, suicidal ideation) trigger immediate direction to emergency services
- No personal health data is stored or logged

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "feat: add my feature"`
4. Push and open a pull request

---

## 📄 License

MIT — free to use, modify, and distribute.
