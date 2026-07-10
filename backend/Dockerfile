# CodeMap backend Dockerfile
# Week 7 upgrade: convert to multi-stage build. For Week 1, simple and clear.

FROM node:22-alpine

# git is needed for cloning repos; not in the base image
RUN apk add --no-cache git

WORKDIR /app

# Copy manifests first so Docker caches the npm install layer.
# Code changes won't re-trigger a full install. (Layer caching = key concept!)
COPY package*.json ./
RUN npm install --omit=dev

COPY src ./src

# Run as non-root: if the untrusted repo somehow exploits something,
# it does NOT have root inside the container.
USER node

EXPOSE 4000
CMD ["npm", "start"]
