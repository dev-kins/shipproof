FROM node:22-alpine AS assets

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY resources ./resources
COPY vite.config.js ./
COPY public ./public
RUN npm run build

FROM composer:2 AS composer-binary

FROM php:8.3-cli AS vendor

RUN apt-get update \
    && apt-get install -y --no-install-recommends git unzip libcurl4-openssl-dev libonig-dev libsqlite3-dev \
    && docker-php-ext-install -j"$(nproc)" curl mbstring pdo_sqlite \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer-binary /usr/bin/composer /usr/local/bin/composer

WORKDIR /app
COPY . ./
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader --no-progress

FROM php:8.3-apache

RUN apt-get update \
    && apt-get install -y --no-install-recommends libcurl4-openssl-dev libonig-dev libsqlite3-dev \
    && docker-php-ext-install -j"$(nproc)" curl mbstring pdo_sqlite \
    && a2enmod rewrite headers \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/html
COPY . ./
COPY --from=vendor /app/vendor ./vendor
COPY --from=assets /app/public/build ./public/build
COPY docker/apache-site.conf /etc/apache2/sites-available/000-default.conf
COPY docker/start.sh /usr/local/bin/shipproof-start

RUN chmod +x /usr/local/bin/shipproof-start \
    && chown -R www-data:www-data storage bootstrap/cache database

EXPOSE 10000
CMD ["/usr/local/bin/shipproof-start"]
