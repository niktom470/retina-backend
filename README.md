# SIH DR Screening — Node.js Backend

Node.js + Express backend that sits between the React frontend and the existing FastAPI ML service. It handles user authentication (JWT + MongoDB) and securely proxies fundus image predictions.

---

## Architecture

```
React Frontend (port 5173)
        │
        │ HTTP / Bearer JWT
        ▼
Node.js Express (port 5000)   ◄─── MongoDB
        │
        │ multipart/form-data
        ▼
FastAPI ML Service (port 8000)
        │
        ▼
  PyTorch DR Model
  Prediction + Confidence + Grad-CAM
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18.0.0 |
| npm | ≥ 9.0.0 |
| MongoDB | Community Server or Atlas |
| Python FastAPI service | Already running (see below) |

---

## Installation

```bash
# From the repo root
cd backend
npm install
```

---

## Environment Setup

Copy the example file and fill in real values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/sih_dr_screening
JWT_SECRET=replace_with_a_long_random_string
JWT_EXPIRES_IN=7d
ML_SERVICE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

> ⚠️ **Never commit `.env` to Git.** It is already listed in `.gitignore`.

**Generate a strong JWT secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## MongoDB Setup

### Option A — Local MongoDB

1. [Download MongoDB Community Server](https://www.mongodb.com/try/download/community)
2. Start: `mongod --dbpath /data/db`
3. Default URI: `mongodb://localhost:27017/sih_dr_screening`

### Option B — MongoDB Atlas (free tier)

1. Create a free cluster at https://cloud.mongodb.com
2. Allow your IP in Network Access
3. Get your connection string and paste it into `MONGO_URI`

---

## Starting the FastAPI ML Service

```bash
# From the repo root — navigate to the AI service directory
cd ../AI

# Activate the virtual environment
# Linux / macOS:
source venv/bin/activate
# Windows (PowerShell):
.\\venv\\Scripts\\Activate.ps1
# Windows (CMD):
.\\venv\\Scripts\\activate.bat

# Start the FastAPI server
uvicorn app:app --host 0.0.0.0 --port 8000

# Or use the convenience script (Windows):
start.bat
```

Verify it is running:
```bash
curl http://localhost:8000/health
```

---

## Starting the Node.js Backend

### Development (auto-restart with nodemon)
```bash
npm run dev
```

### Production
```bash
npm start
```

Successful startup output:
```
✅ MongoDB connected: localhost
═══════════════════════════════════════════════
🚀 SIH DR Screening Backend
   Server   : http://localhost:5000
   Health   : http://localhost:5000/api/health
   ML Proxy : http://localhost:5000/api/predict
   Env      : development
═══════════════════════════════════════════════
```

---

## API Reference

### Health

| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| `GET` | `/api/health` | None | Backend status |
| `GET` | `/api/health/ml` | None | FastAPI ML service status |

**GET /api/health**
```json
{ "success": true, "message": "Backend is running", "timestamp": "..." }
```

**GET /api/health/ml** (FastAPI running)
```json
{ "success": true, "mlService": "healthy" }
```

**GET /api/health/ml** (FastAPI down)
```json
{ "success": false, "mlService": "unavailable", "reason": "Connection refused" }
```
HTTP 503

---

### Authentication

| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| `POST` | `/api/auth/register` | None | Create account |
| `POST` | `/api/auth/login` | None | Get JWT |
| `GET` | `/api/auth/me` | Bearer JWT | Current user |

**POST /api/auth/register**
```json
// Request body
{ "name": "Dr. Sharma", "email": "doctor@example.com", "password": "password123" }

// Response 201
{
  "success": true,
  "message": "Registration successful",
  "user": { "id": "...", "name": "Dr. Sharma", "email": "doctor@example.com" },
  "token": "<JWT>"
}
```

**POST /api/auth/login**
```json
// Request body
{ "email": "doctor@example.com", "password": "password123" }

// Response 200
{
  "success": true,
  "user": { "id": "...", "name": "Dr. Sharma", "email": "doctor@example.com" },
  "token": "<JWT>"
}
```

**GET /api/auth/me** *(requires Bearer JWT)*
```json
// Response 200
{
  "success": true,
  "user": { "id": "...", "name": "Dr. Sharma", "email": "doctor@example.com", "createdAt": "..." }
}
```

---

### Prediction

| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| `POST` | `/api/predict` | Bearer JWT | Analyse fundus image |

**POST /api/predict**

```
Content-Type: multipart/form-data
Authorization: Bearer <JWT>
Field name:   file
```

```json
// Response 200
{
  "success": true,
  "class_name": "Moderate NPDR",
  "confidence": 0.923,
  "heatmap_base64": "data:image/png;base64,...",
  "processing_time_ms": 1234
}
```

**Error Responses**

| Status | Cause |
|--------|-------|
| `400` | No image file provided |
| `401` | Missing / invalid / expired JWT |
| `413` | Image > 10 MB |
| `502` | FastAPI ML service error |
| `503` | FastAPI ML service unreachable |
| `504` | FastAPI ML service timeout |

---

## Frontend Integration

The React frontend must send requests to the Node backend, **not** directly to FastAPI.

Set the API base URL in the React `.env`:
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

Example fetch:
```js
// Login
const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const data = await res.json();
const token = data.token; // store in localStorage or context

// Predict
const formData = new FormData();
formData.append('file', imageFile); // field name must be "file"

const predRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/predict`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
});
const prediction = await predRes.json();
```

---

## Testing with curl

### Health check
```bash
curl http://localhost:5000/api/health
```

### Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Doctor","email":"test@sih.com","password":"password123"}'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@sih.com","password":"password123"}'
```

### Current user
```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

### ML Health
```bash
curl http://localhost:5000/api/health/ml
```

### Predict
```bash
curl -X POST http://localhost:5000/api/predict \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -F "file=@/path/to/fundus_image.jpg"
```

---

## Common Errors

| Error | Likely Cause | Fix |
|-------|-------------|-----|
| `MongoDB connection failed` | MongoDB not running | Start MongoDB or check `MONGO_URI` |
| `ECONNREFUSED 8000` | FastAPI not running | Start the Python ML service |
| `TokenExpiredError` | JWT expired | Log in again |
| `CORS policy` | Frontend URL mismatch | Set `FRONTEND_URL` in `.env` |
| `LIMIT_FILE_SIZE` | Image > 10 MB | Use a smaller image |

---

## FastAPI Contract (Defaults)

If the FastAPI service uses different field names or endpoint paths, update:

- **`ML_SERVICE_URL`** in `.env` — base URL (default: `http://localhost:8000`)
- **`src/controllers/predict.controller.js`** — the `form.append('file', ...)` field name and the `/predict` path

The response fields (`class_name`, `confidence`, `heatmap_base64`, `processing_time_ms`) are passed through unchanged to the React frontend.
