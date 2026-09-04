FROM node:20-alpine AS base
WORKDIR /app

COPY package.json ./
COPY packages/dashboard/package.json packages/dashboard/

RUN npm install --workspace=@spread-scanner/dashboard

COPY packages/dashboard/ packages/dashboard/

ENV NEXT_TELEMETRY_DISABLED=1

RUN npx --workspace=@spread-scanner/dashboard next build

EXPOSE 3000
CMD ["npx", "--workspace=@spread-scanner/dashboard", "next", "start", "--port", "3000"]
