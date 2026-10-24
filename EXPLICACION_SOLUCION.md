# Resumen y Explicación de la Solución: Módulo de CoopCréditos

**Módulo de Administración de Solicitudes de Crédito para el Sector Financiero Solidario**  
*Desarrollado para CoopCréditos SAS*

---

## 1. Propósito y Alcance

Esta solución sistematiza y automatiza el ciclo de vida completo de las solicitudes de crédito para entidades del sector solidario (cooperativas de ahorro y crédito, fondos de empleados y mutuales). Permite radicar solicitudes, evaluar viabilidad, transicionar estados bajo auditoría estricta, simular cuotas en tiempo real, notificar a sistemas externos vía webhooks firmados y consultar métricas gerenciales de colocación de cartera.

---

## 2. Arquitectura General y Tecnologías

El sistema se diseñó bajo una arquitectura en capas, desacoplada, orientada a servicios y contenerizada:

```
┌─────────────────────────────────────────────────────────────┐
│                   Cliente Web (Angular 20)                  │
│       Dashboard  ·  Listado  ·  Radicación  ·  Detalle      │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / JSON
┌──────────────────────────────▼──────────────────────────────┐
│                  API REST (Node.js 22 + Express 5)          │
│   Seguridad (Helmet/RateLimit) · Zod · Router · Controllers  │
│   Servicios de Negocio · Máquina de Estados · Repositorio    │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │ Evento Asíncrono
┌──────────────▼──────────────┐┌──────────────▼───────────────┐
│     SQL Server 2022         ││  Webhook Externo             │
│ Transacciones ACID          ││  Firma HMAC-SHA256           │
│ Integridad y Auditoría      ││  Trazas en WebhookLogs       │
└─────────────────────────────┘└──────────────────────────────┘
```

| Capa | Tecnologías Clave | Responsabilidad |
|---|---|---|
| **Frontend** | Angular 20, Signals, Zoneless, CSS nativo | Interfaz gerencial y operativa, reactividad, simulador de cuotas y vistas de auditoría. |
| **Backend** | Node.js 22, Express 5, TypeScript, Zod | API REST, orquestación de reglas de negocio, máquina de estados y seguridad. |
| **Persistencia** | Microsoft SQL Server 2022, `mssql` pool | Almacenamiento relacional transaccional con precisión financiera (`DECIMAL(18,2)`). |
| **Integración** | Webhooks HTTP con HMAC-SHA256 | Notificación asíncrona no bloqueante de eventos a terceros con bitácora de entrega. |
| **Despliegue** | Docker & Docker Compose | Entorno contenerizado reproducible (`sqlserver`, `db-init`, `backend`, `frontend`). |
| **Pruebas** | Jest + Supertest | Cobertura de pruebas unitarias de negocio y pruebas de integración de API REST. |

---

## 3. Base de Datos y Modelo Relacional

Se implementó el esquema en SQL Server (`database/02_schema.sql`) estructurado en 4 tablas con restricciones de integridad referencial:

1. **`Asociados`**: Datos maestros de los asociados titulares.
2. **`Creditos`**: Registro principal de la solicitud.
   - Código único legible por humanos (`CR-YYYY-######`).
   - Montos financieros almacenados en `DECIMAL(18,2)` y tasas en `DECIMAL(5,2)` para evitar imprecisiones de coma flotante.
   - Timestamps en UTC (`SYSUTCDATETIME()`) para consistencia horaria global.
   - **Borrado lógico (`isDeleted = 1`)**: Garantiza que ningún registro desaparezca físicamente de la base de datos, cumpliendo normativas de la Superintendencia de la Economía Solidaria.
3. **`HistorialCredito` (Auditoría Financiera - Append Only)**:
   - Registra cada transición de estado con su estado anterior, estado nuevo, usuario responsable, fecha UTC y observación/justificación obligatoria.
   - Es una bitácora inmutable: no admite modificaciones ni eliminaciones.
4. **`WebhookLogs`**:
   - Guarda el registro de cada intento de despacho de webhook (`eventId`, payload enviado, respuesta HTTP del receptor, estado exitoso/fallido y marca de tiempo).
5. **Índices Estratégicos**:
   - Índices en `identificacionAsociado`, `estado` y `fechaSolicitud` para asegurar consultas y paginaciones de alta velocidad.

---

## 4. Lógica Financiera y Reglas de Negocio

### A. Máquina de Estados Finitos
Controla rigurosamente el flujo del crédito para impedir transiciones ilógicas (por ejemplo, pasar de `RECHAZADO` a `DESEMBOLSADO`):

- `SOLICITADO` ➔ Puede pasar a `EN_ESTUDIO` o `CANCELADO`.
- `EN_ESTUDIO` ➔ Puede pasar a `APROBADO`, `RECHAZADO` o `CANCELADO`.
- `APROBADO` ➔ Puede pasar a `DESEMBOLSADO` o `CANCELADO`.
- `DESEMBOLSADO`, `RECHAZADO`, `CANCELADO` ➔ **Estados terminales** (no admiten más transiciones).

### B. Control Anti-Duplicados
Para prevenir fraudes o dobles radicaciones accidentales, el sistema rechaza la solicitud (`409 Conflict`) si:
- El asociado ya cuenta con una solicitud activa en `SOLICITADO` o `EN_ESTUDIO` para la misma línea de crédito en los últimos 30 días.
- O tiene una solicitud pendiente con idéntico monto y número de cuotas.

### C. Inmutabilidad de Condiciones
Una vez que el crédito alcanza el estado `APROBADO` o `DESEMBOLSADO`, sus condiciones contractuales (monto solicitado, tasa y cuotas) quedan congeladas. Cualquier intento de edición posterior es rechazado por la API.

---

## 5. Integración por Webhook y Tolerancia a Fallos

Cuando un crédito se radica:
1. **Prioridad en Persistencia**: El crédito se almacena y confirma primero en la base de datos de manera transaccional.
2. **Despacho No Bloqueante**: La notificación al webhook externo se dispara de forma asíncrona. Si el webhook falla, tiene latencia o responde con error HTTP, **la transacción del crédito nunca se revierte ni afecta al usuario**.
3. **Firma Criptográfica**: Cada petición incluye el encabezado `X-Webhook-Signature` generado mediante `HMAC-SHA256` con clave secreta compartida, permitiendo al receptor validar la autenticidad e integridad del mensaje.
4. **Trazabilidad y Resiliencia**: Se almacena el resultado en `WebhookLogs`. En un entorno productivo de gran volumen, esto alimenta una cola con reintentos exponenciales y Dead Letter Queue (DLQ).
5. **Receptor Simulado**: Se implementó el endpoint `/api/webhooks/receiver` para permitir pruebas de extremo a extremo sin dependencias externas.

---

## 6. Frontend: Módulos y Experiencia de Usuario

Desarrollado en Angular 20 utilizando standalone components y detección de cambios sin `zone.js` (zoneless) para máximo rendimiento:

1. **Dashboard General (`/dashboard`)**:
   - Tarjetas de KPIs: total de créditos, monto global colocado ($ COP), créditos en estudio y créditos desembolsados.
   - Barra de distribución porcentual por estado.
2. **Listado de Solicitudes (`/creditos`)**:
   - Búsqueda reactiva por cédula, nombre o número de crédito.
   - Filtro interactivo por estado.
   - Paginación del lado del servidor.
   - Badges de estado con codificación semántica de colores y tooltips de ayuda.
3. **Radicación de Crédito (`/creditos/nuevo`)**:
   - Formulario reactivo con validaciones financieras.
   - **Simulador de Cuota en Tiempo Real**: Calcula la cuota mensual estimada según el monto, tasa y plazo a medida que el usuario interactúa.
4. **Detalle y Auditoría (`/creditos/:id`)**:
   - Tarjeta de condiciones y estado actual.
   - Selector inteligente de cambio de estado (muestra exclusivamente las transiciones válidas según la máquina de estados).
   - Campo obligatorio de motivo/observación.
   - Línea de tiempo visual del historial de auditoría con fecha, usuario y notas.
   - Visualizador de eventos de webhook despachados.

---

## 7. Seguridad y Buenas Prácticas

- **Consultas Parametrizadas**: El repositorio SQL utiliza variables tipadas en todos los queries y transacciones, mitigando completamente ataques de inyección SQL (SQLi).
- **Validación Estricta**: Todas las entradas son validadas en el backend con esquemas Zod antes de alcanzar la capa de servicios.
- **Cabeceras HTTP Seguras**: Implementación de `helmet` para proteger contra Clickjacking, XSS y ataques de cabeceras.
- **Protección contra Abuso**: Rate limiting con `express-rate-limit`.
- **Documentación Interactiva**: Especificación OpenAPI 3.0 servida en `/api/docs` mediante Swagger UI.
- **Health Checks**: Endpoints `/api/health/live` y `/api/health/ready` (este último valida conectividad real con SQL Server).

---

## 8. Calidad y Pruebas Automatizadas

Se construyó una suite de pruebas automatizadas con Jest y Supertest cubriendo:
- Pruebas unitarias de la máquina de estados y transiciones permitidas/bloqueadas.
- Pruebas de control de duplicados y validaciones financieras.
- Pruebas de endpoints de la API REST (ciclo completo de radicación, consulta, cambio de estado y manejo de errores 400/404/409/422).
- **Resultado:** 18 pruebas ejecutadas y pasando al 100%.

---

## 9. Estrategia de Escalabilidad a Gran Escala

En el documento complementario `DECISIONES_TECNICAS.md` se diseñó la ruta para escalar la solución de 500 a 500.000 créditos mensuales:
- **Multi-tenancy**: Columna `tenantId` con Row-Level Security (RLS) en fase inicial; bases de datos dedicadas por entidad en fase avanzada.
- **Segregación CQRS**: Escrituras en nodo primario SQL Server y lecturas/reportes en réplicas de solo lectura (*Always On*).
- **Event-Driven Architecture**: Integración con Apache Kafka / RabbitMQ para procesar webhooks, score de riesgo y contabilidad de forma distribuida.
- **Caché en Memoria**: Redis para consultas de asociados frecuentes y catálogos de convenios.
