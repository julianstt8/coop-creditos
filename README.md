# OPA Créditos

Módulo para administrar las solicitudes de crédito de los asociados de una entidad del sector financiero solidario.

| Parte | Tecnología |
|---|---|
| API | Node.js 22, TypeScript, Express 5 |
| Base de datos | Microsoft SQL Server 2022 |
| Web | Angular 20 (componentes standalone, sin zone.js) |
| Pruebas API | Jest + Supertest |
| Documentación API | Swagger / OpenAPI 3 en `/api/docs` |

## Estructura

```
opa-creditos/
├── backend/              API REST
│   ├── src/
│   │   ├── config/       variables de entorno (validadas con zod) y pool de SQL Server
│   │   ├── docs/         documento OpenAPI
│   │   ├── modules/      un módulo por recurso (health, creditos, webhooks...)
│   │   ├── shared/       errores, formato de respuesta, middlewares, logger
│   │   ├── app.ts        arma la aplicación Express (se usa en pruebas sin abrir puerto)
│   │   └── server.ts     arranca el servidor
│   └── tests/
├── frontend/             aplicación Angular
│   └── src/app/
│       ├── core/         modelos e interceptores compartidos
│       └── features/     dashboard y pantallas de créditos
├── database/             scripts SQL, se ejecutan en orden de nombre
├── docker-compose.yml
└── .env.example
```

## Requisitos

- Node.js 20 o superior y npm
- Docker Desktop (para SQL Server o para levantar todo)

## Ejecutar con Docker (todo junto)

```bash
cp .env.example .env
docker compose up --build
```

- Web: http://localhost:8080
- API: http://localhost:3000/api
- Swagger: http://localhost:3000/api/docs

## Ejecutar en modo desarrollo

1. Levanta solo SQL Server y crea la base de datos:

   ```bash
   cp .env.example .env
   docker compose up -d sqlserver db-init
   ```

2. API:

   ```bash
   cd backend
   cp .env.example .env      # usa la misma DB_PASSWORD del .env de la raíz
   npm install
   npm run dev               # http://localhost:3000
   npm test
   ```

3. Web (en otra terminal):

   ```bash
   cd frontend
   npm install
   npm start                 # http://localhost:4200, redirige /api al backend
   ```

## Formato de respuesta de la API

Éxito:

```json
{ "success": true, "data": { }, "meta": { "page": 1, "pageSize": 20, "totalItems": 0, "totalPages": 0 } }
```

Error:

```json
{ "success": false, "error": { "code": "CREDITO_NOT_FOUND", "message": "El crédito no existe" } }
```

## Endpoints disponibles

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/health/live` | El proceso está arriba |
| GET | `/api/health/ready` | La API puede atender (SQL Server disponible) |
| GET | `/api/docs` | Swagger UI |
