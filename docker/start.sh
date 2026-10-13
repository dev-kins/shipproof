#!/bin/sh
set -eu

port="${PORT:-10000}"
db_path="${DB_DATABASE:-/tmp/shipproof.sqlite}"

sed -i "s/Listen 80/Listen ${port}/" /etc/apache2/ports.conf
sed -i "s/\*:80/*:${port}/" /etc/apache2/sites-available/000-default.conf

mkdir -p "$(dirname "$db_path")" storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache
touch "$db_path"
php artisan migrate --force
chown -R www-data:www-data "$db_path" storage bootstrap/cache

exec apache2-foreground
