# Use Debian-based Node.js image (includes OpenSSL needed by Prisma)
FROM node:22-slim

WORKDIR /app

# Install OpenSSL (required by Prisma)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Install ALL dependencies (including devDependencies for prisma generate)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and Prisma schema
COPY prisma ./prisma
COPY src ./src

# Generate Prisma client
RUN npx prisma generate

# Remove devDependencies to keep image smaller
RUN npm prune --production

EXPOSE 8080
ENV PORT=8080

CMD ["npm", "start"]
