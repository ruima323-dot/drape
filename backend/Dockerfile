FROM node:20-slim

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/

# Install dependencies
RUN npm ci

# Copy source
COPY shared/ shared/
COPY backend/ backend/

# Build shared types then backend
RUN npm run build --workspace=shared
RUN npm run build --workspace=backend

# Create directories for file storage
RUN mkdir -p generated-images uploaded-photos

EXPOSE 3001

CMD ["node", "backend/dist/index.js"]
