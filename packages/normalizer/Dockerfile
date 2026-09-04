FROM node:20-alpine AS base
WORKDIR /app

COPY package.json ./
COPY shared/schemas/package.json shared/schemas/
COPY shared/kafka/package.json shared/kafka/
COPY shared/db/package.json shared/db/
COPY packages/normalizer/package.json packages/normalizer/

RUN npm install --workspace=@spread-scanner/normalizer

COPY shared/ shared/
COPY packages/normalizer/ packages/normalizer/
COPY tsconfig.base.json ./

CMD ["npx", "--workspace=@spread-scanner/normalizer", "tsx", "src/index.ts"]
