# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app

# Copy package files first (better layer caching)
COPY package.json package-lock.json ./

# Clean install using the now-synced lockfile
RUN npm ci --frozen-lockfile

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: Production
FROM nginx:alpine

RUN addgroup -g 1001 -S nginx && \
    adduser -S -D -H -u 1001 -h /var/cache/nginx -s /sbin/nologin -G nginx nginx

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
USER 1001

CMD ["nginx", "-g", "daemon off;"]
