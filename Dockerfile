# ---- Build stage: compile the static site with Vite ----
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies against the lockfile for reproducible builds.
COPY package*.json ./
RUN npm ci

# Build the app -> /app/dist
COPY . .
RUN npm run build

# ---- Serve stage: tiny nginx serving the static dist/ ----
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
