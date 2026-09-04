FROM node:20-alpine AS base
WORKDIR /app

COPY package.json ./
COPY shared/schemas/package.json shared/schemas/
COPY shared/kafka/package.json shared/kafka/
COPY shared/db/package.json shared/db/
COPY packages/ingestion-polymarket/package.json packages/ingestion-polymarket/

RUN npm install --workspace=@spread-scanner/ingestion-polymarket

COPY shared/ shared/
COPY packages/ingestion-polymarket/ packages/ingestion-polymarket/
COPY tsconfig.base.json ./

CMD ["npx", "--workspace=@spread-scanner/ingestion-polymarket", "tsx", "src/index.ts"]
