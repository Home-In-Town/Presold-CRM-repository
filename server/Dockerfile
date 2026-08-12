# Use a slim Node.js image for production
FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --production

# Copy source and Prisma schema
COPY prisma ./prisma
COPY src ./src

# Generate Prisma client
RUN npx prisma generate

EXPOSE 8080
ENV PORT=8080

CMD ["npm", "start"]
