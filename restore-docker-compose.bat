@echo off
cd /d "%~dp0"
echo Restoring docker-compose.yml...

(
echo services:
echo   postgres:
echo     image: postgres:15-alpine
echo     container_name: jojo-postgres
echo     environment:
echo       POSTGRES_DB: jojo_db
echo       POSTGRES_USER: jojo_user
echo       POSTGRES_PASSWORD: jojo_dev_password
echo     volumes:
echo       - postgres_data:/var/lib/postgresql/data
echo       - ./database/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
echo     ports:
echo       - "5432:5432"
echo     healthcheck:
echo       test: ["CMD-SHELL", "pg_isready -U jojo_user -d jojo_db"]
echo       interval: 10s
echo       timeout: 5s
echo       retries: 5
echo   redis:
echo     image: redis:7-alpine
echo     container_name: jojo-redis
echo     ports:
echo       - "6379:6379"
echo     healthcheck:
echo       test: ["CMD", "redis-cli", "ping"]
echo       interval: 10s
echo       timeout: 5s
echo       retries: 5
echo   operations-service:
echo     build: ./packages/api/operations-service
echo     container_name: jojo-operations
echo     environment:
echo       PORT: 3000
echo       DATABASE_URL: postgresql://jojo_user:jojo_dev_password@postgres:5432/jojo_db
echo       REDIS_URL: redis://redis:6379
echo       NODE_ENV: development
echo       N8N_API_URL: https://dodgeqtr.app.n8n.cloud
echo       N8N_API_KEY: ""
echo       GEMINI_API_KEY: ""
echo     ports:
echo       - "3000:3000"
echo     depends_on:
echo       postgres:
echo         condition: service_healthy
echo       redis:
echo         condition: service_healthy
echo   crm-service:
echo     build: ./packages/api/crm-service
echo     container_name: jojo-crm
echo     environment:
echo       PORT: 3001
echo       DATABASE_URL: postgresql://jojo_user:jojo_dev_password@postgres:5432/jojo_db
echo       REDIS_URL: redis://redis:6379
echo       NODE_ENV: development
echo     ports:
echo       - "3001:3001"
echo     depends_on:
echo       postgres:
echo         condition: service_healthy
echo       redis:
echo         condition: service_healthy
echo   n8n-service:
echo     build: ./packages/api/n8n-service
echo     container_name: jojo-n8n
echo     environment:
echo       PORT: 3002
echo       DATABASE_URL: postgresql://jojo_user:jojo_dev_password@postgres:5432/jojo_db
echo       REDIS_URL: redis://redis:6379
echo       NODE_ENV: development
echo       N8N_API_URL: https://dodgeqtr.app.n8n.cloud
echo       N8N_API_KEY: ""
echo     ports:
echo       - "3002:3002"
echo     depends_on:
echo       postgres:
echo         condition: service_healthy
echo       redis:
echo         condition: service_healthy
echo   web:
echo     build: ./packages/web
echo     container_name: jojo-web
echo     environment:
echo       VITE_API_URL: http://localhost:3000
echo     ports:
echo       - "5173:5173"
echo volumes:
echo   postgres_data:
echo networks:
echo   default:
echo     name: jojo-network
) > docker-compose.yml

echo Done! docker-compose.yml restored.
pause
