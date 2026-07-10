# CodeMap frontend Dockerfile (dev mode for Week 1)
# Week 7 upgrade: multi-stage production build (next build + standalone output)

FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]
