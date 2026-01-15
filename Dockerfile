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

FROM ubuntu:24.04 AS runner

RUN apt-get update && apt-get install -y \
    curl \
    supervisor \
    ca-certificates \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

COPY --from=cooklang-builder /build/target/release/cooklang-import /usr/local/bin/cooklang-import

RUN pip3 install --no-cache-dir --break-system-packages fastapi uvicorn httpx

WORKDIR /app

COPY --from=node-builder /app/.output ./.output
COPY --from=node-builder /app/package.json ./
COPY --from=node-builder /app/package-lock.json ./

RUN npm ci --omit=dev

COPY services/cooklang-import/server.py /app/cooklang-import/server.py

RUN mkdir -p /var/log/supervisor

COPY --from=node-builder /app/supervisord.conf /etc/supervisord.conf

ENV NODE_ENV=production

EXPOSE 3000 8080

CMD ["supervisord", "-c", "/etc/supervisord.conf"]
