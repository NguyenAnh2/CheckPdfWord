# Stage 1: Build
FROM node:18-alpine AS builder
FROM nginx:stable-alpine

# Working directory chính xác
WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY tailwind.config.js ./
COPY postcss.config.js ./

COPY ./src ./src
COPY ./public ./public
COPY index.html ./

# KHÔNG cần cài nodejs và npm vì image node:18 đã có sẵn!
RUN apt-get update
RUN apt-get -y install nodejs
RUN apt-get -y install npm

RUN npm install
RUN npm run build

# Stage 2: Serve với nginx
COPY ./dist /usr/share/nginx/html

EXPOSE 80

# nginx -g daemon off;
CMD ["nginx", "-g", "daemon off;"]
