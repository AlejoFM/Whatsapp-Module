FROM php:8.2-fpm

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libzip-dev \
    zip \
    unzip \
    supervisor \
    && docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd zip

# Instalar Redis extension
RUN pecl install redis && docker-php-ext-enable redis

# Instalar Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Establecer directorio de trabajo
WORKDIR /var/www

# Copiar todo el código de la aplicación primero
COPY . .

# Instalar dependencias de PHP después de copiar todo el código
RUN composer install --no-dev --optimize-autoloader --no-interaction

# Configurar permisos
RUN chown -R www-data:www-data /var/www \
    && chmod -R 755 /var/www/storage \
    && chmod -R 755 /var/www/bootstrap/cache

# Copiar configuración de supervisor
COPY docker/supervisor/laravel-echo.conf /etc/supervisor/conf.d/
COPY docker/supervisor/supervisord.conf /etc/supervisor/

# Exponer puerto
EXPOSE 9000

# Comando por defecto
CMD ["php-fpm"]
