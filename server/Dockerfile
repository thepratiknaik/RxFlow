FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./

FROM base AS dev

RUN npm ci

COPY . .

ENV NODE_ENV=development

EXPOSE 5000

CMD ["npm", "run", "dev", "--", "--legacy-watch"]

FROM base AS production

RUN npm ci --omit=dev

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
