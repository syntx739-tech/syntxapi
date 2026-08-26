FROM node:20-alpine

WORKDIR /app

# Copy package files and install
COPY package.json package-lock.json* ./
RUN npm install --production

# Copy server files
COPY server/ ./server/

# Create data directory
RUN mkdir -p server/data

# Expose port
EXPOSE 5000

# Start the API server
CMD ["node", "server/api-server.mjs"]
