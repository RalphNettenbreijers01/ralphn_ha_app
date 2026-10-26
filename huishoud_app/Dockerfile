FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8099
COPY --from=build /app/dist ./dist
COPY server.js merge.js ./
EXPOSE 8099
CMD ["node", "server.js"]
