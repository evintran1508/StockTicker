# Stage 1: Build React Vite Bundle
FROM node:20-alpine AS build
WORKDIR /app

# Copy dependencies manifest
COPY package*.json ./
RUN npm install

# Copy source và build production artifact
COPY . .
RUN npm run build

# Stage 2: Serve qua Nginx Alpine siêu nhẹ
FROM nginx:alpine AS final

# Copy build bundle sang thư mục phục vụ web của Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copy cấu hình Nginx có tích hợp Reverse Proxy cho SignalR WebSocket
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
