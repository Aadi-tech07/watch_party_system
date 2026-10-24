# Multi-stage Dockerfile for YouTube Watch Party System
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm install
RUN npm --prefix backend install
RUN npm --prefix frontend install

# Copy source files
COPY . .

# Build backend and frontend
RUN npm run build

# Production Runner
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5001

COPY package*.json ./
COPY backend/package*.json ./backend/

# Install only production dependencies in backend
RUN npm --prefix backend install --omit=dev

# Copy built backend and frontend dist
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/src ./backend/src
COPY --from=builder /app/frontend/dist ./frontend/dist

EXPOSE 5001

CMD ["npm", "run", "start"]
