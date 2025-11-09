# Multi-stage Dockerfile for HackTrent DAW
# Combines backend and frontend into a single service

# ===== Frontend Build Stage =====
FROM node:18-bullseye AS frontend-builder

WORKDIR /app

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci --no-audit --no-fund

# Copy frontend source
COPY frontend/ ./

# Build the app
RUN npm run build


# ===== Combined Backend + Frontend Service =====
FROM python:3.11-slim

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/server.py .

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/dist ./static

# Cloud Run sets PORT (8080) by default
EXPOSE 8080

CMD ["python", "server.py"]
