FROM node:18-alpine as build

ARG VITE_API_BASE_URL=http://localhost:8000
ARG VITE_APP_BRAND_NAME="StatCat Sports Analysis"
ARG VITE_BRAND_ID=statcat-sports-analysis
ARG VITE_BRAND_FAVICON="/media/statCatLogo2-black.ico"

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_APP_BRAND_NAME=$VITE_APP_BRAND_NAME
ENV VITE_BRAND_ID=$VITE_BRAND_ID
ENV VITE_BRAND_FAVICON=$VITE_BRAND_FAVICON

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (dev deps needed for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Remove dev dependencies to keep the final image lean
RUN npm prune --production

# Production stage
FROM nginx:alpine

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
