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

# Copy modular backend package
COPY backend/ backend/

# Copy React build output from frontend stage
COPY --from=frontend /frontend/dist dashboard-ui/dist/

EXPOSE 8080
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080"]
