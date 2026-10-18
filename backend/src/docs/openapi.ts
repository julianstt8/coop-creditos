export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'OPA SAS - Módulo de Créditos API',
    version: '1.0.0',
    description:
      'API REST empresarial para la administración, radicación, evaluación y auditoría de solicitudes de crédito de asociados en el sector financiero solidario.',
    contact: {
      name: 'Equipo de Desarrollo OPA SAS',
    },
  },
  servers: [{ url: '/api', description: 'Servidor API' }],
  tags: [
    { name: 'Créditos', description: 'Operaciones de administración y ciclo de vida de créditos' },
    { name: 'Webhooks', description: 'Trazabilidad y recepción de eventos de integración externa' },
    { name: 'Health', description: 'Monitoreo de liveness y readiness del servicio' },
  ],
  paths: {
    '/health/live': {
      get: {
        tags: ['Health'],
        summary: 'Liveness probe',
        description: 'Verifica que el proceso Node.js se encuentre en ejecución.',
        responses: {
          '200': { description: 'Proceso saludable' },
        },
      },
    },
    '/health/ready': {
      get: {
        tags: ['Health'],
        summary: 'Readiness probe',
        description: 'Verifica que la API tenga conectividad activa con SQL Server.',
        responses: {
          '200': { description: 'Servicio listo para recibir tráfico' },
          '503': {
            description: 'Base de datos no disponible',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/creditos/stats': {
      get: {
        tags: ['Créditos'],
        summary: 'Estadísticas del Dashboard',
        description: 'Retorna el total de créditos, cartera colocada y desglose agregado por cada estado.',
        responses: {
          '200': {
            description: 'Métricas obtenidas exitosamente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/CreditoStats' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/creditos': {
      post: {
        tags: ['Créditos'],
        summary: 'Radicar nueva solicitud de crédito',
        description:
          'Crea un crédito con validaciones financieras, control de duplicados y notificación asíncrona por webhook.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateCreditoInput' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Crédito creado exitosamente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Credito' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Error de validación de datos',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          '409': {
            description: 'Conflicto: Solicitud duplicada detectada',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
      get: {
        tags: ['Créditos'],
        summary: 'Consultar créditos con paginación y filtros',
        description: 'Permite filtrar por estado, cédula del asociado o término de búsqueda global.',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 10 } },
          {
            name: 'estado',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['SOLICITADO', 'EN_ESTUDIO', 'APROBADO', 'RECHAZADO', 'DESEMBOLSADO', 'CANCELADO'],
            },
          },
          { name: 'identificacion', in: 'query', schema: { type: 'string' } },
          { name: 'q', in: 'query', schema: { type: 'string' } },
          {
            name: 'sortBy',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['fechaSolicitud', 'valorSolicitado', 'numeroCredito', 'estado'],
              default: 'fechaSolicitud',
            },
          },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
        ],
        responses: {
          '200': {
            description: 'Listado paginado de créditos',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Credito' } },
                    meta: { $ref: '#/components/schemas/PaginationMeta' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/creditos/{id}': {
      get: {
        tags: ['Créditos'],
        summary: 'Consultar crédito por ID con historial y webhook',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': {
            description: 'Detalle del crédito con historial de auditoría',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/CreditoConDetalle' },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Crédito no encontrado',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
      patch: {
        tags: ['Créditos'],
        summary: 'Actualizar condiciones de un crédito',
        description: 'Permite actualizar datos siempre que el crédito esté en SOLICITADO o EN_ESTUDIO.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateCreditoInput' } } },
        },
        responses: {
          '200': { description: 'Crédito actualizado' },
          '409': { description: 'Crédito inmutable por su estado actual' },
        },
      },
      delete: {
        tags: ['Créditos'],
        summary: 'Borrado lógico del crédito',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': { description: 'Crédito marcado como eliminado lógicamente' },
          '404': { description: 'Crédito no encontrado' },
        },
      },
    },
    '/creditos/{id}/estado': {
      patch: {
        tags: ['Créditos'],
        summary: 'Cambiar estado del crédito (Máquina de Estados)',
        description:
          'Valida transiciones de estado permitidas y registra obligatoriamente en el historial de auditoría.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ChangeEstadoInput' } } },
        },
        responses: {
          '200': { description: 'Transición de estado exitosa' },
          '422': { description: 'Transición de estado inválida para las reglas de negocio' },
        },
      },
    },
    '/webhooks/receiver': {
      post: {
        tags: ['Webhooks'],
        summary: 'Receptor simulado de webhooks',
        description: 'Valida la firma HMAC-SHA256 y procesa la notificación recibida para pruebas locales.',
        responses: {
          '200': { description: 'Webhook recibido y validado' },
        },
      },
    },
  },
  components: {
    schemas: {
      CreateCreditoInput: {
        type: 'object',
        required: [
          'identificacionAsociado',
          'nombreAsociado',
          'tipoCredito',
          'valorSolicitado',
          'tasaInteres',
          'numeroCuotas',
          'formaPago',
        ],
        properties: {
          identificacionAsociado: { type: 'string', example: '1001234567' },
          nombreAsociado: { type: 'string', example: 'Juan Pérez Gómez' },
          tipoCredito: {
            type: 'string',
            enum: ['LIBRE_INVERSION', 'VIVIENDA', 'EDUCATIVO', 'VEHICULO', 'CALAMIDAD', 'COMERCIAL'],
            example: 'LIBRE_INVERSION',
          },
          valorSolicitado: { type: 'number', example: 15000000 },
          tasaInteres: { type: 'number', example: 1.45 },
          numeroCuotas: { type: 'integer', example: 36 },
          formaPago: {
            type: 'string',
            enum: ['NOMINA', 'VENTANILLA', 'DEBITO_AUTOMATICO'],
            example: 'NOMINA',
          },
        },
      },
      UpdateCreditoInput: {
        type: 'object',
        properties: {
          nombreAsociado: { type: 'string', example: 'Juan Pérez Gómez Modificado' },
          valorSolicitado: { type: 'number', example: 18000000 },
          tasaInteres: { type: 'number', example: 1.35 },
          numeroCuotas: { type: 'integer', example: 48 },
          formaPago: { type: 'string', enum: ['NOMINA', 'VENTANILLA', 'DEBITO_AUTOMATICO'] },
        },
      },
      ChangeEstadoInput: {
        type: 'object',
        required: ['estadoNuevo'],
        properties: {
          estadoNuevo: {
            type: 'string',
            enum: ['SOLICITADO', 'EN_ESTUDIO', 'APROBADO', 'RECHAZADO', 'DESEMBOLSADO', 'CANCELADO'],
            example: 'EN_ESTUDIO',
          },
          usuario: { type: 'string', example: 'analista.credito@opasolidaria.com' },
          observacion: {
            type: 'string',
            example: 'Documentación validada en centrales de riesgo. Capacidad favorable.',
          },
        },
      },
      Credito: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          numeroCredito: { type: 'string', example: 'CR-2026-000001' },
          idAsociado: { type: 'integer', example: 1 },
          identificacionAsociado: { type: 'string', example: '1001234567' },
          nombreAsociado: { type: 'string', example: 'Juan Pérez Gómez' },
          tipoCredito: { type: 'string', example: 'LIBRE_INVERSION' },
          valorSolicitado: { type: 'number', example: 15000000 },
          tasaInteres: { type: 'number', example: 1.45 },
          numeroCuotas: { type: 'integer', example: 36 },
          formaPago: { type: 'string', example: 'NOMINA' },
          estado: { type: 'string', example: 'SOLICITADO' },
          fechaSolicitud: { type: 'string', format: 'date-time' },
          fechaActualizacion: { type: 'string', format: 'date-time' },
          isDeleted: { type: 'boolean', example: false },
        },
      },
      CreditoConDetalle: {
        allOf: [
          { $ref: '#/components/schemas/Credito' },
          {
            type: 'object',
            properties: {
              historial: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    estadoAnterior: { type: 'string', nullable: true },
                    estadoNuevo: { type: 'string' },
                    usuario: { type: 'string' },
                    observacion: { type: 'string', nullable: true },
                    fechaCambio: { type: 'string', format: 'date-time' },
                  },
                },
              },
              webhookLogs: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    eventId: { type: 'string' },
                    url: { type: 'string' },
                    responseStatus: { type: 'integer', nullable: true },
                    exitoso: { type: 'boolean' },
                    intentos: { type: 'integer' },
                    fechaCreacion: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        ],
      },
      CreditoStats: {
        type: 'object',
        properties: {
          totalCreditos: { type: 'integer', example: 5 },
          montoTotalCartera: { type: 'number', example: 188000000 },
          porEstado: {
            type: 'object',
            additionalProperties: {
              type: 'object',
              properties: {
                cantidad: { type: 'integer' },
                monto: { type: 'number' },
              },
            },
          },
        },
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          pageSize: { type: 'integer', example: 10 },
          totalItems: { type: 'integer', example: 25 },
          totalPages: { type: 'integer', example: 3 },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'CREDITO_NOT_FOUND' },
              message: { type: 'string', example: 'El crédito no existe' },
              details: {},
            },
            required: ['code', 'message'],
          },
        },
        required: ['success', 'error'],
      },
    },
  },
};
