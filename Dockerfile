FROM node:20.18.1-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg curl git ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# npm (not yarn) so peer dependencies such as mongodb get installed, same as on Termux
COPY package.json .npmrc ./
RUN npm install --no-audit --no-fund --legacy-peer-deps=false

COPY . .

ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=450
EXPOSE 3000

CMD ["node", "index.js"]
