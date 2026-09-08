FROM node:20-alpine AS base
WORKDIR /app

COPY package.json ./
COPY shared/schemas/package.json shared/schemas/
COPY shared/kafka/package.json shared/kafka/
COPY shared/db/package.json shared/db/
COPY packages/analytics/package.json packages/analytics/

RUN npm install --workspace=@spread-scanner/analytics

COPY shared/ shared/
COPY packages/analytics/ packages/analytics/
COPY tsconfig.base.json ./

CMD ["npx", "--workspace=@spread-scanner/analytics", "tsx", "src/index.ts"]
