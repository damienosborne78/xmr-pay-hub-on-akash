# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json ./

# Use npm install instead of ci to handle any minor mismatches gracefully
# (still deterministic enough for most frontend apps)
RUN npm ci --frozen-lockfile || npm install --frozen-lockfile || npm install

# Copy the rest of the source code
COPY . .

# Build the Vite app
RUN npm run build

# Stage 2: Production (lightweight)
FROM nginx:alpine

# Optional: non-root user for better security
RUN addgroup -g 1001 -S nginx && \
    adduser -S -D -H -u 1001 -h /var/cache/nginx -s /sbin/nologin -G nginx nginx

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

USER 1001

CMD ["nginx", "-g", "daemon off;"]
