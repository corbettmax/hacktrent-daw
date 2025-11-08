FROM node:18-bullseye

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci --no-audit --no-fund

# Copy the rest of the frontend sources
COPY . .

EXPOSE 5173

# Start Vite on 0.0.0.0 so it's reachable from the host
CMD ["sh", "-c", "npm run dev -- --host 0.0.0.0"]
