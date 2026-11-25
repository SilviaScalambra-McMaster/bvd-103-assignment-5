FROM node:20-bookworm
WORKDIR /app
COPY tsconfig.json ./
COPY package*.json ./
COPY services/warehouse/package.json services/warehouse/package.json
COPY packages/messaging/package.json packages/messaging/package.json
RUN npm install
COPY packages packages
COPY services/warehouse services/warehouse
WORKDIR /app/services/warehouse
ENV NODE_ENV=production
ENV PORT=3000
CMD ["npm","run","start"]
