# Use a slim Node.js image for production
FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --production

# Copy source and Prisma schema
COPY prisma ./prisma
COPY src ./src

EXPOSE 5001
ENV PORT=5001

CMD ["npm", "start"]
