FROM node:20-alpine AS base
WORKDIR /app

COPY package.json ./
COPY shared/schemas/package.json shared/schemas/
COPY shared/kafka/package.json shared/kafka/
COPY shared/db/package.json shared/db/
COPY packages/spread-detector/package.json packages/spread-detector/

RUN npm install --workspace=@spread-scanner/spread-detector

COPY shared/ shared/
COPY packages/spread-detector/ packages/spread-detector/
COPY tsconfig.base.json ./

CMD ["npx", "--workspace=@spread-scanner/spread-detector", "tsx", "src/index.ts"]
