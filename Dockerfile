FROM python:3.11-slim

WORKDIR /app

# Upgrade pip and install build tools for native dependencies
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Install dependencies first for better Docker layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY main.py .
COPY demo_vulnerable_app.py .
COPY dashboard/ dashboard/

EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
