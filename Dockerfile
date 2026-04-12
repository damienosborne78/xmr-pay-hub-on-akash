FROM node:20-alpine AS build
WORKDIR /app

# Copy package files first for better caching
COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile || npm install

# Copy source and build
COPY . .
RUN npm run build

# Stage 2: Production - Serve with nginx:alpine
FROM nginx:alpine
RUN echo "nameserver 1.1.1.1\nnameserver 1.0.0.1" > /etc/resolv.conf

# Install curl and dumb-init
RUN apk add --no-cache curl dumb-init

# Download and install cloudflared
RUN curl -s -o /usr/local/bin/cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 && \
    chmod +x /usr/local/bin/cloudflared

# Copy our custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built frontend files
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# Run as the existing 'nginx' user (already created in nginx:alpine)
USER nginx
# IMPORTANT: Run as root to avoid permission errors on cache directories
USER root

# Create a startup script
RUN echo '#!/bin/sh\nnginx -g "daemon off;" &\nexec dumb-init -- cloudflared tunnel --no-autoupdate run --token ${TUNNEL_TOKEN}' > /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]   
