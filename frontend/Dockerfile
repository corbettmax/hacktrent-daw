FROM node:18-bullseye

WORKDIR /app

# Copy frontend sources
COPY . /app

WORKDIR /app/frontend

# Install dependencies
RUN npm ci --no-audit --no-fund

EXPOSE 5173

# Start Vite on 0.0.0.0 so it's reachable from the host
CMD ["sh", "-c", "npm run dev -- --host 0.0.0.0"]
