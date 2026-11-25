FROM node:20-bookworm
WORKDIR /app
COPY tsconfig.json ./
COPY package*.json ./
COPY services/orders/package.json services/orders/package.json
COPY packages/messaging/package.json packages/messaging/package.json
RUN npm install
COPY packages packages
COPY services/orders services/orders
WORKDIR /app/services/orders
ENV NODE_ENV=production
ENV PORT=3000
CMD ["npm","run","start"]
