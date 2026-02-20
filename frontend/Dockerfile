# Step 1: build the React app
FROM node:24 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Step 2: serve it with nginx
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html