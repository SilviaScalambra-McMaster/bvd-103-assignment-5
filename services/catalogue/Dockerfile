FROM node:20-bookworm
WORKDIR /app
COPY tsconfig.json ./
COPY package*.json ./
COPY services/catalogue/package.json services/catalogue/package.json
COPY packages/messaging/package.json packages/messaging/package.json
RUN npm install
COPY packages packages
COPY services/catalogue services/catalogue
WORKDIR /app/services/catalogue
ENV NODE_ENV=production
ENV PORT=3000
CMD ["npm","run","start"]
