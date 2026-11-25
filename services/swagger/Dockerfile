FROM node:20-bookworm
WORKDIR /app
COPY package*.json ./
COPY services services
COPY packages packages
COPY scripts scripts
RUN npm install
RUN npm run generate:spec
WORKDIR /app/services/swagger
ENV NODE_ENV=production
ENV PORT=3000
CMD ["npm","run","start"]
