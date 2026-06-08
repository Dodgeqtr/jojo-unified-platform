FROM node:20-alpine
WORKDIR /app
COPY package.json .
RUN npm install
COPY ../../shared /app/shared
COPY src /app/src
EXPOSE 3001
CMD ["npm", "run", "dev"]
