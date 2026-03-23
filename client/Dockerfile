FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./

FROM base AS dev

RUN npm ci

ENV NODE_ENV=development

EXPOSE 3000

CMD ["npm", "start"]

FROM base AS builder

RUN npm ci

# Copy environment file so react-scripts can read REACT_APP_* values at build time
COPY .env ./.env
COPY public ./public
COPY src ./src

RUN npm run build

FROM node:20-alpine AS production

WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/build ./build

EXPOSE 3000

ENV NODE_ENV=production

CMD ["serve", "-s", "build", "-l", "3000"]
