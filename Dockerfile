FROM node:20-alpine
WORKDIR /app

# Copy lockfiles and configuration
COPY package*.json tsconfig.base.json ./

# Copy all package.json files for dependency resolution caching
COPY apps/api/package.json ./apps/api/
COPY apps/order-worker/package.json ./apps/order-worker/
COPY apps/socket-gateway/package.json ./apps/socket-gateway/
COPY apps/web/package.json ./apps/web/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies (will be cached unless package.json files change)
RUN npm install && npm cache clean --force

# Copy actual source code
COPY apps ./apps
COPY packages ./packages

# Run unified build script in correct dependency order
RUN npm run build && rm -rf apps/web/.next/cache

# We intentionally do NOT use a multi-stage build to save disk space on EC2 during docker build.
# The entry point will be specified via command in docker-compose.yml
