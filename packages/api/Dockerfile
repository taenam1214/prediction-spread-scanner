FROM node:20-alpine AS base
WORKDIR /app

COPY package.json ./
COPY shared/schemas/package.json shared/schemas/
COPY shared/db/package.json shared/db/
COPY packages/api/package.json packages/api/

RUN npm install --workspace=@spread-scanner/api

COPY shared/ shared/
COPY packages/api/ packages/api/
COPY tsconfig.base.json ./

EXPOSE 3001
CMD ["npx", "--workspace=@spread-scanner/api", "tsx", "src/index.ts"]
