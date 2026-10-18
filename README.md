# OPA Créditos

Módulo para administrar solicitudes de crédito del sector financiero solidario.

| Parte      | Tecnología                                   |
| ---------- | -------------------------------------------- |
| API        | Node.js 22 · TypeScript · Express 5         |
| Base datos | Microsoft SQL Server 2022                    |
| Web        | Angular 20 (standalone, sin zone.js)         |
| Pruebas    | Jest + Supertest                             |
| Docs API   | Swagger UI en `/api/docs`                    |

---

## Levantar con Docker

```bash
cp .env.example .env
docker compose up --build
```

| Servicio | URL                            |
| -------- | ------------------------------ |
| Web      | http://localhost:8080          |
| API      | http://localhost:4000/api      |
| Swagger  | http://localhost:4000/api/docs |

> **Nota:** Al iniciar por primera vez, el contenedor `db-init` precarga automáticamente la base de datos con asociados y solicitudes de crédito en diferentes estados para interactuar de inmediato.

---

## Decisiones Técnicas y Arquitectura

Para conocer la justificación sobre el manejo de montos (`DECIMAL` vs. `float`), la inmutabilidad y auditoría, la estrategia del Webhook y el diseño para escalar a 500.000 créditos/mes, consulta:
👉 **[DECISIONES_TECNICAS.md](DECISIONES_TECNICAS.md)**

---

## Desarrollo local

```bash
# 1. Base de datos
cp .env.example .env
docker compose up -d sqlserver db-init

# 2. API  (terminal 1)
cd backend && npm install && npm run dev    # :4000

# 3. Web  (terminal 2)
cd frontend && npm install && npm start    # :4200
```

**Tests:**
```bash
cd backend && npm test
```

---

## Endpoints

| Método      | Ruta                        | Descripción                                     |
| ----------- | --------------------------- | ----------------------------------------------- |
| `GET`       | `/api/health/live`          | Liveness check                                  |
| `GET`       | `/api/health/ready`         | Readiness check (conectividad DB)               |
| `GET`       | `/api/docs`                 | Swagger UI                                      |
| `GET`       | `/api/creditos/stats`       | Metricas para el Dashboard                      |
| `POST`      | `/api/creditos`             | Radicar nueva solicitud                         |
| `GET`       | `/api/creditos`             | Listar con paginacion y filtros                 |
| `GET`       | `/api/creditos/:id`         | Detalle + historial de auditoria + webhooks     |
| `PUT/PATCH` | `/api/creditos/:id`         | Actualizar condiciones (solo estados editables) |
| `PATCH`     | `/api/creditos/:id/estado`  | Cambio de estado con maquina de estados         |
| `DELETE`    | `/api/creditos/:id`         | Borrado logico (isDeleted = 1)                  |
| `POST`      | `/api/webhooks/receiver`    | Receptor simulado para pruebas de webhook       |
