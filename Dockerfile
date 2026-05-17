FROM docker.m.daocloud.io/library/node:20-bookworm-slim

WORKDIR /app

RUN sed -i 's|deb.debian.org|mirrors.aliyun.com|g; s|security.debian.org|mirrors.aliyun.com|g' /etc/apt/sources.list.d/debian.sources \
  && apt-get update \
  && apt-get install -y --no-install-recommends sqlite3 ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json ./
COPY server.js ./
COPY scripts ./scripts
COPY public ./public
COPY data/db.json ./data/db.json

ENV NODE_ENV=production
ENV PORT=3000
ENV TRADEPILOT_DATA_DIR=/app/runtime-data

EXPOSE 3000

CMD ["npm", "run", "start"]
