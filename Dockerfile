# Stage 1: Build the React/Vite app
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

# Copy our custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built frontend files
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# Run as the existing 'nginx' user (already created in nginx:alpine)
USER nginx

CMD ["nginx", "-g", "daemon off;"]
