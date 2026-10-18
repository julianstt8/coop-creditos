# OPA Créditos

Módulo para administrar las solicitudes de crédito de los asociados de una entidad del sector financiero solidario.

| Parte             | Tecnología                                       |
| ----------------- | ------------------------------------------------ |
| API               | Node.js 22, TypeScript, Express 5                |
| Base de datos     | Microsoft SQL Server 2022                        |
| Web               | Angular 20 (componentes standalone, sin zone.js) |
| Pruebas API       | Jest + Supertest                                 |
| Documentación API | Swagger / OpenAPI 3 en `/api/docs`               |

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
- API: http://localhost:4000/api
- Swagger: http://localhost:4000/api/docs

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
{
  "success": true,
  "data": {},
  "meta": { "page": 1, "pageSize": 20, "totalItems": 0, "totalPages": 0 }
}
```

Error:

```json
{
  "success": false,
  "error": { "code": "CREDITO_NOT_FOUND", "message": "El crédito no existe" }
}
```

## Endpoints Disponibles

| Método      | Ruta                       | Descripción                                                              |
| ----------- | -------------------------- | ------------------------------------------------------------------------ |
| `GET`       | `/api/health/live`         | Verifica que el proceso de la API esté activo (Liveness)                 |
| `GET`       | `/api/health/ready`        | Verifica que la API tenga conectividad activa con SQL Server (Readiness) |
| `GET`       | `/api/docs`                | Documentación interactiva Swagger UI / OpenAPI 3.0                       |
| `GET`       | `/api/creditos/stats`      | Métricas agregadas y estadísticas para el Dashboard                      |
| `POST`      | `/api/creditos`            | Radicar nueva solicitud de crédito (con validaciones y webhook)          |
| `GET`       | `/api/creditos`            | Consultar créditos (paginación, filtros por estado, cédula y búsqueda)   |
| `GET`       | `/api/creditos/:id`        | Detalle del crédito + Historial de auditoría + Trazas de webhook         |
| `PUT/PATCH` | `/api/creditos/:id`        | Actualizar condiciones permitidas (en estados editables)                 |
| `PATCH`     | `/api/creditos/:id/estado` | Cambio de estado controlado con máquina de estados y auditoría           |
| `DELETE`    | `/api/creditos/:id`        | Borrado lógico del crédito (`isDeleted = 1`)                             |
| `POST`      | `/api/webhooks/receiver`   | Receptor simulado para probar y verificar webhooks en local              |

## Documentación de Sustentación (50% de la Evaluación)

Para la sustentación de la prueba técnica, consulta:

- **[`DECISIONES_TECNICAS.md`](DECISIONES_TECNICAS.md):**
  - Justificación de tipos de datos financieros (`DECIMAL(18,2)`), llaves e índices.
  - Inmutabilidad vs. Mutabilidad en el sector financiero solidario.
  - Resiliencia y contingencia ante fallos en la integración por Webhook (HMAC-SHA256).
  - Despliegue en producción (HTTPS, secretos, backups de SQL Server, CI/CD, stateless vs. stateful).
  - Propuesta de escalabilidad para pasar de 500 a 500.000 créditos mensuales con múltiples entidades cooperativas (Multi-tenancy, CQRS, Kafka/RabbitMQ, Read Replicas, Caching).
- **[`PLAN_DESARROLLO.md`](PLAN_DESARROLLO.md):** Plan y checklist de implementación fase por fase.
