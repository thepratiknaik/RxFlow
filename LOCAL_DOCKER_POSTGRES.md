# Local PostgreSQL with Docker

This guide runs PostgreSQL locally in Docker for RxFlow development.

## Prerequisites

- Docker Desktop running
- PowerShell terminal in the project root

## 1) Start a local PostgreSQL container

Preferred option for this repo: use the compose override that adds PostgreSQL to the dev stack.

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml -f docker-compose.dev.postgres.yml up --build
```

Alternative option: run PostgreSQL as a standalone Docker container.

Run:

```bash
docker run -d \
  --name rxflow-postgres \
  -e POSTGRES_DB=rxflow \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  -v rxflow_pgdata:/var/lib/postgresql/data \
  postgres:16
```

What this does:

- Creates database: rxflow
- Creates user: postgres
- Exposes PostgreSQL on localhost:5432
- Persists data in Docker volume: rxflow_pgdata

## 2) Point server environment to local Postgres

Set these values in server/.env:

```env
DB_HOST=host.docker.internal
DB_PORT=5432
DB_NAME=rxflow
DB_USER=postgres
DB_PASSWORD=password
```

Notes:

- Use host.docker.internal when the server runs in Docker and needs to reach Postgres on your host.
- If the server runs directly on your machine (not in Docker), set DB_HOST=localhost.

## 3) Verify PostgreSQL is healthy

Check container status:

```bash
docker ps --filter "name=rxflow-postgres"
```

Optional connectivity check:

```bash
docker exec -it rxflow-postgres psql -U postgres -d rxflow -c "SELECT 1;"
```

## 4) Start RxFlow services

If you used the compose override in step 1, you are already running all services and can skip this step.

Development mode:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Detached mode:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d
```

## 5) Stop or remove PostgreSQL container

Stop:

```bash
docker stop rxflow-postgres
```

Start again:

```bash
docker start rxflow-postgres
```

Remove container (keeps volume):

```bash
docker rm rxflow-postgres
```

Remove container and data volume:

```bash
docker rm -f rxflow-postgres
docker volume rm rxflow_pgdata
```

## Troubleshooting

- Port 5432 in use:
  - Find and stop the conflicting process, or remap to another host port and update DB_PORT.
- Authentication failed:
  - Confirm DB_USER and DB_PASSWORD in server/.env match container settings.
- Server cannot connect from Docker:
  - If using standalone postgres container, ensure DB_HOST=host.docker.internal in server/.env.
  - If using docker-compose.dev.postgres.yml, DB_HOST is set to postgres by compose override.
