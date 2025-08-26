FROM node:18-alpine

# Instalar dependencias del sistema
RUN apk add --no-cache supervisor

# Crear directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm install -g laravel-echo-server

# Copiar configuración de Laravel Echo
COPY laravel-echo-server.json ./

# Copiar configuración de supervisor
COPY docker/supervisor/laravel-echo.conf /etc/supervisor/conf.d/

# Crear directorio para logs
RUN mkdir -p /var/log/laravel-echo

# Exponer puerto
EXPOSE 6001

# Comando por defecto
CMD ["laravel-echo-server", "start"]
