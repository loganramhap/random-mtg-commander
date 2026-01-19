# Multi-stage Docker build for MTG Commander Picker
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy frontend source
COPY . .
RUN npm run build

# Python backend stage
FROM python:3.11-slim AS backend

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy Python requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Python API
COPY api/ ./api/

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/dist ./static

# Create a simple server that serves both
COPY docker-server.py .

EXPOSE 8000

CMD ["python", "docker-server.py"]