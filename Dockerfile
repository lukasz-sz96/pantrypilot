FROM node:22-bookworm AS node-builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run build

FROM rust:1.83-slim-bookworm AS cooklang-builder

RUN apt-get update && apt-get install -y \
    git \
    pkg-config \
    libssl-dev \
    make \
    perl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
RUN git clone --depth 1 https://github.com/cooklang/cooklang-import.git .
RUN cargo build --release

FROM ghcr.io/get-convex/convex-backend:latest AS convex-backend

FROM ghcr.io/get-convex/convex-dashboard:latest AS convex-dashboard

FROM python:3.11-slim-bookworm AS runner

RUN apt-get update && apt-get install -y \
    curl \
    supervisor \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

COPY --from=convex-backend /convex/bin/convex-local-backend /usr/local/bin/convex-local-backend

COPY --from=convex-dashboard /app /app/convex-dashboard

COPY --from=cooklang-builder /build/target/release/cooklang-import /usr/local/bin/cooklang-import

RUN pip install --no-cache-dir fastapi uvicorn httpx

WORKDIR /app

COPY --from=node-builder /app/dist ./dist
COPY --from=node-builder /app/package.json ./
COPY --from=node-builder /app/package-lock.json ./

RUN npm ci --omit=dev

COPY services/cooklang-import/server.py /app/cooklang-import/server.py

RUN mkdir -p /convex/data /var/log/supervisor

COPY <<'EOF' /etc/supervisord.conf
[supervisord]
nodaemon=true
logfile=/var/log/supervisor/supervisord.log
pidfile=/var/run/supervisord.pid
user=root

[program:convex-backend]
command=/usr/local/bin/convex-local-backend --port 3210 --site-proxy-port 3211
directory=/convex/data
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
priority=1

[program:cooklang-import]
command=uvicorn server:app --host 0.0.0.0 --port 8080
directory=/app/cooklang-import
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
priority=3

[program:convex-dashboard]
command=node /app/convex-dashboard/server.js
directory=/app/convex-dashboard
environment=PORT="6791",NEXT_PUBLIC_DEPLOYMENT_URL="http://localhost:3210"
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
priority=2

[program:app]
command=node /app/dist/server/server.js
directory=/app
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
priority=4
startsecs=5
EOF

ENV NODE_ENV=production
ENV VITE_CONVEX_URL=http://localhost:3210

EXPOSE 3000 3210 3211 6791 8080

VOLUME ["/convex/data"]

CMD ["supervisord", "-c", "/etc/supervisord.conf"]
