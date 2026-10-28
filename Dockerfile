# ── Stage 1: Build ────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

# ── Stage 2: Serve with nginx ─────────────────────────────────
FROM nginx:1.25-alpine
COPY --from=builder /app/dist/smart-poultry-frontend/browser /usr/share/nginx/html

# nginx config for Angular SPA (handle HTML5 routing)
RUN echo 'server { \
  listen 80; \
  root /usr/share/nginx/html; \
  index index.html; \
  location / { \
    try_files $uri $uri/ /index.html; \
  } \
  location /api/ { \
    proxy_pass http://backend:8000/api/; \
    proxy_set_header Host $host; \
    proxy_set_header X-Real-IP $remote_addr; \
  } \
  gzip on; \
  gzip_types text/plain text/css application/json application/javascript; \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
