# Stage 1: Build React app
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --frozen-lockfile
COPY . .
RUN npm run build

# Stage 2: nginx:alpine (CLEAN)
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

# CRITICAL: Copy nginx.conf for SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
USER root
CMD ["nginx", "-g", "daemon off;"]
