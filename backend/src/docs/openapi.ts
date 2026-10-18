export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'OPA Créditos API',
    version: '0.1.0',
    description: 'API REST para administrar las solicitudes de crédito de los asociados.',
  },
  servers: [{ url: '/api' }],
  tags: [{ name: 'Health', description: 'Estado del servicio' }],
  paths: {
    '/health/live': {
      get: {
        tags: ['Health'],
        summary: 'Verifica que el proceso esté arriba',
        responses: { '200': { description: 'Servicio arriba' } },
      },
    },
    '/health/ready': {
      get: {
        tags: ['Health'],
        summary: 'Verifica que el servicio pueda atender (base de datos disponible)',
        responses: {
          '200': { description: 'Listo para atender' },
          '503': {
            description: 'Base de datos no disponible',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
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
