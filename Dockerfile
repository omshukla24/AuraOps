# ── Stage 1: Build React Frontend ──
FROM node:22-slim AS frontend
WORKDIR /frontend
COPY dashboard-ui/package*.json ./
RUN npm ci
COPY dashboard-ui/ ./
RUN npm run build

# ── Stage 2: Python Backend ──
FROM python:3.11-slim
WORKDIR /app

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip setuptools wheel
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY main.py .
COPY demo_vulnerable_app.py .

# Copy React build output from frontend stage
COPY --from=frontend /frontend/dist dashboard-ui/dist/

EXPOSE 8080
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
