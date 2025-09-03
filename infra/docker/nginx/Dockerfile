FROM alpine:3.22.1

# Installation des dépendances
RUN apk add --no-cache \
    nginx \
    openssl \
    && rm -rf /var/cache/apk/*

# Création des répertoires nécessaires
RUN mkdir -p /var/log/nginx \
    && mkdir -p /etc/nginx/ssl \
    && mkdir -p /run/nginx

# Copie de la configuration nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Génération automatique des certificats SSL au build
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/key.pem \
    -out /etc/nginx/ssl/cert.pem \
    -subj "/C=FR/ST=Paris/L=Paris/O=42/OU=Student/CN=localhost"

# Permissions
RUN chown -R nginx:nginx /var/log/nginx \
    && chown -R nginx:nginx /etc/nginx/ssl

# Exposition des ports
EXPOSE 80 443

# Démarrage de nginx
CMD ["nginx", "-g", "daemon off;"]
