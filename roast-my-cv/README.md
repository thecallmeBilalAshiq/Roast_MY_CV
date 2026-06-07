# Roast My CV

A full-stack web app where users upload a PDF or DOCX resume and receive a funny AI roast, serious feedback, scores, charts, and a shareable result page.

## Stack

- Frontend: Next.js App Router, React, Tailwind CSS, Recharts
- Backend: FastAPI, Motor, PyPDF2, python-docx, OpenAI
- Database: MongoDB
- Runtime: Docker Compose

## Quick Start

```bash
cd roast-my-cv
cp .env.example .env
```

Add `OPENAI_API_KEY` to `.env` for real GPT-4o roasts. Without a key, the backend returns a local fallback roast so the app still works.

```bash
docker compose up --build
```

Open:

- Frontend: http://localhost:3000
- Backend health: http://localhost:8000/health

## Local Development

Run MongoDB locally or with Docker:

```bash
docker compose up mongo
```

Backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
MONGODB_URI=mongodb://localhost:27017/roast_my_cv uvicorn main:app --reload
```

Frontend:

```bash
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

## API

- `POST /upload-cv` uploads and parses a PDF or DOCX CV, max 5MB.
- `POST /roast` streams an SSE roast for a `session_id`.
- `GET /roast/{id}` returns a saved roast.
- `GET /hall-of-shame` lists anonymized public roasts.
- `POST /hall-of-shame/{id}/submit` publishes a roast anonymously.
- `POST /hall-of-shame/{id}/upvote` upvotes a public roast.

## Data and Safety

The app never stores uploaded files. It extracts text, sanitizes it, labels likely CV sections, stores only text plus roast metadata, and rate limits roast/upload requests per IP.
