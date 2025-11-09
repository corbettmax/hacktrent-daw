# Multi-stage Dockerfile for HackTrent DAW
# This builds both backend and frontend services

# ===== Backend Stage =====
FROM python:3.11-slim AS backend

WORKDIR /app

COPY backend/requirements.txt .
COPY backend/server.py .

RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 8000

CMD ["python", "server.py"]


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


# ===== Frontend Production Stage =====
FROM nginx:alpine AS frontend

# Copy built files from builder
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# Configure nginx for SPA and correct port
RUN echo 'server { \
    listen 5173; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"]
