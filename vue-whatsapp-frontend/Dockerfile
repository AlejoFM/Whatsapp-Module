FROM node:18-alpine as build-stage

# Establecer directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar todas las dependencias (incluyendo devDependencies para el build)
RUN npm ci

# Copiar código fuente
COPY . .

# Construir aplicación
RUN npm run build

# Etapa de producción con Nginx
FROM nginx:alpine as production-stage

# Copiar archivos construidos
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copiar configuración de Nginx
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf

# Exponer puerto
EXPOSE 80

# Comando por defecto
CMD ["nginx", "-g", "daemon off;"]
