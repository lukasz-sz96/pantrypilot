FROM rust:1.83-slim-bookworm AS builder

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

FROM python:3.11-slim-bookworm

RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /build/target/release/cooklang-import /usr/local/bin/cooklang-import

RUN pip install --no-cache-dir fastapi uvicorn httpx

COPY server.py /app/server.py

WORKDIR /app

EXPOSE 8080

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8080"]
