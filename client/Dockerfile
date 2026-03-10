# Stage 1: Build the React application
FROM node:18-alpine AS builder

WORKDIR /app

# Accept build arguments
ARG VITE_API_BASE_URL

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY public ./public
COPY src ./src

# Set environment variable for build time
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Build the application
RUN npm run build

# Stage 2: Serve the built application
FROM node:18-alpine

WORKDIR /app

# Install a simple static server
RUN npm install -g serve

# Copy the built application from builder stage
COPY --from=builder /app/build ./build

# Expose port
EXPOSE 3000

# Set environment variable for production
ENV NODE_ENV=production

# Start the application
CMD ["serve", "-s", "build", "-l", "3000"]
