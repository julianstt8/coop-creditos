# Decisiones Técnicas

**Prueba Técnica | CoopCréditos SAS - Módulo de Créditos**

---

## 1. Base de datos

### ¿Por qué `DECIMAL` y no `float` para los montos?

Los tipos `float` y `double` almacenan números con imprecisión binaria. Al sumar muchos montos, esa imprecisión se acumula y genera errores contables (p.ej. 100.00 + 200.00 = 299.9999...). En sistemas financieros esto es inaceptable.

Por eso se usa `DECIMAL(18,2)` para montos y `DECIMAL(5,2)` para tasas: garantiza exactitud en cada operación aritmética.

Las fechas se guardan en UTC universal para que no haya confusión cuando los servidores estén en distintas zonas horarias.

### Claves e índices

- Cada tabla tiene un ID numérico autoincremental como clave primaria. Esto hace que la base de datos organice los datos de forma ordenada y eficiente.
- Los créditos tienen además un identificador legible (`CR-2026-000001`) único, para referencia humana y contable.
- Se prohíbe eliminar un asociado que tenga créditos registrados, para no perder el historial.
- Se crearon índices en las columnas más consultadas (cédula, estado, fecha) para que los filtros y la paginación respondan rápido incluso con millones de registros.

---

## 2. Qué se puede cambiar y qué no

En el sector financiero hay información que nunca debe modificarse una vez registrada:

**No cambia nunca (inmutable):**

- El titular del crédito, su número y su fecha de radicación.
- El historial de cambios de estado: cada acción queda registrada permanentemente. No se puede borrar ni editar ningún registro histórico.
- Las condiciones del crédito (monto, tasa, cuotas) una vez que pasa a `APROBADO` o `DESEMBOLSADO`, quedan fijas. Esto protege el contrato con el asociado.
- Los créditos no se eliminan físicamente. Se marcan como eliminados (`isDeleted = 1`) para que quede rastro ante cualquier auditoría.

**Sí puede cambiar (controlado):**

- El estado del crédito, pero solo siguiendo el flujo definido (`SOLICITADO → EN_ESTUDIO → APROBADO → DESEMBOLSADO`, etc.) y siempre registrando quién hizo el cambio y por qué.
- El monto o cuotas de una solicitud, pero solo mientras esté en etapa de análisis. Si ya fue aprobado, la API rechaza cualquier intento de modificación.

---

## 3. Webhook

Al registrar un nuevo crédito, el sistema notifica automáticamente a un servicio externo (webhook). Estas son las decisiones clave:

**El crédito siempre se guarda primero.** La notificación externa no bloquea ni puede cancelar la radicación. Si el servicio externo falla, el crédito ya existe y es válido.

**Seguridad:** Cada notificación lleva una firma digital (HMAC-SHA256) generada con una clave secreta compartida. El receptor puede verificar que el mensaje viene realmente del sistema y no fue alterado.

**Si la notificación falla** (el servidor externo no responde, da error, etc.):

1. El crédito **NO** se revierte.
2. El intento fallido queda registrado en la tabla `WebhookLogs` con todos los detalles.
3. En producción, el sistema reintentaría automáticamente con pausas crecientes (1 min, 5 min, 15 min, 1h...). Si sigue fallando, se genera una alerta para que el equipo técnico intervenga.

---

## 4. Despliegue en producción

### Cómo se vería la infraestructura

```
Usuario (navegador)
       |
   Firewall web (bloquea ataques)
       |
   Balanceador de carga (distribuye el tráfico, HTTPS)
      /           \
 Frontend        API (Node.js)  <-- secretos desde Key Vault
 (página web)         |
                 Base de datos SQL Server
                  /         \
            Escrituras     Lecturas / reportes
                  |
            Copias de seguridad automáticas
```

**Frontend y API** no guardan estado propio: cualquier instancia puede atender cualquier petición. Esto permite agregar más servidores automáticamente si aumenta el tráfico.

**La base de datos** es la única pieza que conserva estado, con transacciones ACID para garantizar integridad.

### Seguridad implementada

- Cabeceras de seguridad HTTP activadas (`helmet`).
- Límite de peticiones por IP para prevenir abuso o ataques de fuerza bruta.
- Todas las consultas a la base de datos usan parámetros, eliminando la posibilidad de inyección SQL.
- Todos los datos de entrada son validados (tipo, longitud, rango) antes de procesarse.
- Las contraseñas y secretos nunca están en el código; se leen de variables de entorno o servicios de secretos (Key Vault).

### Copias de seguridad

| Tipo | Frecuencia | Para qué sirve |
|---|---|---|
| Completo | Diario | Restauración total |
| Diferencial | Cada 6 h | Recuperación rápida del día |
| Log de transacciones | Cada 15 min | Recuperación a un minuto exacto |

En caso de falla, se puede recuperar hasta 15 minutos antes del incidente (RPO) y el sistema volvería a estar disponible en menos de 1 hora (RTO).

### CI/CD y monitoreo

- La API expone endpoints de salud (`/health/live`, `/health/ready`) que el orquestador usa para detectar si el servicio debe reiniciarse o sacar del tráfico.
- Todos los eventos se registran en formato estructurado (JSON) con un ID de rastreo, facilitando la investigación de incidentes.
- El pipeline de despliegue ejecuta pruebas automáticas, revisión de tipos y análisis de vulnerabilidades antes de publicar a producción.

---

## 5. Escalabilidad: de 500 a 500.000 créditos al mes

### Múltiples cooperativas (multi-tenancy)

**Fase inicial:** se agrega un campo `tenantId` a cada registro. La base de datos aplica reglas automáticas para que una cooperativa nunca vea datos de otra, aunque compartan el mismo servidor.

**Fase avanzada:** cada cooperativa grande tiene su propia base de datos física. El sistema detecta automáticamente a cuál conectarse según quién esté autenticado.

### Separar lecturas de escrituras (CQRS)

Con 500.000 créditos al mes, las consultas (listados, reportes, dashboards) son mucho más frecuentes que las escrituras. Para no saturar el servidor principal:

- Las escrituras (`POST`, `PATCH`) van al servidor principal.
- Las consultas van a servidores de solo lectura sincronizados automáticamente.
- La tabla de créditos se divide por períodos de tiempo (anual/trimestral) para que las búsquedas solo recorran los datos activos.

### Notificaciones desacopladas (eventos)

En lugar de disparar el webhook directamente, la API publica un evento en una cola de mensajería (Kafka / RabbitMQ). Distintos servicios lo consumen en paralelo e independientemente:

- Uno envía el webhook con reintentos automáticos.
- Otro consulta centrales de riesgo (TransUnion, Datacrédito).
- Otro actualiza los reportes en tiempo real.

Si uno falla, los demás siguen funcionando.

### Caché (Redis)

Los catálogos que se consultan repetidamente (convenios de nómina, datos de asociados frecuentes) se guardan en memoria con Redis. Esto reduce hasta un 70% las consultas a la base de datos y mejora la velocidad de respuesta.
