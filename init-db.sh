#!/bin/bash
# Cria o banco ominy_ads dentro do postgres_postgres existente
# Executar na desenv-00 ANTES do primeiro deploy

POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-""}

if [ -z "$POSTGRES_PASSWORD" ]; then
  echo "Erro: defina POSTGRES_PASSWORD antes de rodar"
  echo "Uso: POSTGRES_PASSWORD=sua_senha bash init-db.sh"
  exit 1
fi

CONTAINER_ID=$(docker ps --filter "name=postgres_postgres" --format "{{.ID}}" | head -1)

if [ -z "$CONTAINER_ID" ]; then
  echo "Erro: container postgres_postgres nao encontrado"
  exit 1
fi

echo "Criando banco ominy_ads (usuario ominy ja eh o superuser do container)..."

# O container postgres_postgres usa POSTGRES_USER=ominy como superuser de bootstrap
# (sem role "postgres"). Conecta no banco padrao "ominy" para criar o banco "ominy_ads".
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$CONTAINER_ID" psql -U ominy -d ominy -c "
CREATE DATABASE ominy_ads OWNER ominy;
" 2>/dev/null || echo "(banco ominy_ads ja existe)"

echo "Banco criado! DATABASE_URL: postgresql://ominy:$POSTGRES_PASSWORD@postgres_postgres:5432/ominy_ads"
