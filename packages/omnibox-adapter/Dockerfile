# OmniBox Adapter Dockerfile
# Windows Desktop Control Service

FROM node:20-alpine

WORKDIR /app

# Install dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build application
RUN npm run build

# Expose port
EXPOSE 5001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5001
ENV OMNIBOX_URL=http://omnibox:5000
ENV OMNIPARSER_URL=http:// bytebot-omniparser:9989

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5001/computer-use', (r) => process.exit(r.statusCode === 404 ? 0 : 1))"

# Start application
CMD ["npm", "run", "start:prod"]
