# مرحلة البناء
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# مرحلة التشغيل النهائية
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist

# Using a simple HTTP server instead of serve
RUN npm install -g http-server

EXPOSE 5173

CMD ["http-server", "dist", "-p", "5173", "-a", "0.0.0.0"]
