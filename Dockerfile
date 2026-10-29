FROM node:20.18.1-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg curl git ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json yarn.lock* .yarnrc .npmrc ./
RUN yarn install --ignore-engines --network-timeout 600000

COPY . .

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "--max-old-space-size=450", "index.js"]
