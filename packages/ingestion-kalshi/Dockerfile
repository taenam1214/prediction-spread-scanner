FROM node:20-alpine AS base
WORKDIR /app

COPY package.json ./
COPY shared/schemas/package.json shared/schemas/
COPY shared/kafka/package.json shared/kafka/
COPY shared/db/package.json shared/db/
COPY packages/ingestion-kalshi/package.json packages/ingestion-kalshi/

RUN npm install --workspace=@spread-scanner/ingestion-kalshi

COPY shared/ shared/
COPY packages/ingestion-kalshi/ packages/ingestion-kalshi/
COPY tsconfig.base.json ./

CMD ["npx", "--workspace=@spread-scanner/ingestion-kalshi", "tsx", "src/index.ts"]
