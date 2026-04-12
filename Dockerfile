# Stage 1: Build the React/Vite app
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile || npm install

COPY . .
RUN npm run build

# Stage 2: Production
FROM nginx:alpine

# Copy our config and the built app
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# IMPORTANT: Run as root to avoid permission errors on cache directories
USER root

CMD ["nginx", "-g", "daemon off;"]
