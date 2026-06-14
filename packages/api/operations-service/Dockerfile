FROM node:20-alpine
WORKDIR /app
COPY packages/api/operations-service/package*.json ./
RUN npm install && npm install -g tsx && ln -s /app/node_modules /node_modules
COPY packages/api/operations-service/ ./
COPY packages/api/shared/ /shared/
EXPOSE 3000
CMD ["tsx", "watch", "src/index.ts"]
