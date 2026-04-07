#!/bin/bash
# Script de build e deploy para Docker Swarm
# Executar na desenv-01: bash deploy.sh

set -e

echo "==> Buildando backend..."
docker build -t ominy-ads-backend:latest ./backend

echo "==> Buildando frontend..."
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://api-dashboard.artuzzyia.com.br \
  -t ominy-ads-frontend:latest \
  ./frontend

echo "==> Criando diretório de config (se não existir)..."
mkdir -p /opt/ads-dashboard/config

if [ ! -f /opt/ads-dashboard/config/meta.yaml ]; then
  cp ./backend/config/meta.yaml.example /opt/ads-dashboard/config/meta.yaml
  echo "ATENÇÃO: Edite /opt/ads-dashboard/config/meta.yaml com suas chaves do Meta Ads"
fi

echo "==> Carregando variáveis de ambiente..."
set -a
source .env
set +a

echo "==> Deploying stack ads-dashboard..."
docker stack deploy -c docker-compose.yml ads-dashboard --with-registry-auth

echo "==> Deploy concluído!"
echo "    Frontend: https://dashboard.artuzzyia.com.br"
echo "    Backend:  https://api-dashboard.artuzzyia.com.br"
