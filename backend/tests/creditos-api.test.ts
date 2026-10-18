import request from 'supertest';
import { createApp } from '../src/app';
import { creditosService } from '../src/modules/creditos/creditos.service';
import { AppError } from '../src/shared/errors/app-error';

describe('Creditos API Endpoints & Validations', () => {
  const app = createApp();

  describe('POST /api/creditos - Validaciones Zod', () => {
    it('rechaza con 400 si el valor solicitado es <= 0', async () => {
      const response = await request(app).post('/api/creditos').send({
        identificacionAsociado: '1001234567',
        nombreAsociado: 'Juan Pérez',
        tipoCredito: 'LIBRE_INVERSION',
        valorSolicitado: -500000,
        tasaInteres: 1.5,
        numeroCuotas: 24,
        formaPago: 'NOMINA',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'valorSolicitado' }),
        ]),
      );
    });

    it('rechaza con 400 si el número de cuotas es <= 0', async () => {
      const response = await request(app).post('/api/creditos').send({
        identificacionAsociado: '1001234567',
        nombreAsociado: 'Juan Pérez',
        tipoCredito: 'LIBRE_INVERSION',
        valorSolicitado: 10000000,
        tasaInteres: 1.5,
        numeroCuotas: 0,
        formaPago: 'NOMINA',
      });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rechaza con 400 si la tasa de interés es negativa', async () => {
      const response = await request(app).post('/api/creditos').send({
        identificacionAsociado: '1001234567',
        nombreAsociado: 'Juan Pérez',
        tipoCredito: 'LIBRE_INVERSION',
        valorSolicitado: 10000000,
        tasaInteres: -0.5,
        numeroCuotas: 12,
        formaPago: 'NOMINA',
      });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rechaza con 400 si el tipo de crédito no existe en el catálogo', async () => {
      const response = await request(app).post('/api/creditos').send({
        identificacionAsociado: '1001234567',
        nombreAsociado: 'Juan Pérez',
        tipoCredito: 'CREDITO_INEXISTENTE',
        valorSolicitado: 10000000,
        tasaInteres: 1.5,
        numeroCuotas: 12,
        formaPago: 'NOMINA',
      });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Controlador & Respuestas de Error', () => {
    it('responde 400 si se envía un ID inválido en GET /api/creditos/:id', async () => {
      const response = await request(app).get('/api/creditos/invalido');
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_ID');
    });

    it('responde 404 si el servicio lanza CREDITO_NOT_FOUND', async () => {
      jest.spyOn(creditosService, 'findById').mockRejectedValueOnce(
        AppError.notFound('CREDITO_NOT_FOUND', 'El crédito no existe'),
      );

      const response = await request(app).get('/api/creditos/99999');
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('CREDITO_NOT_FOUND');
    });

    it('responde 409 si el servicio detecta un crédito duplicado', async () => {
      jest.spyOn(creditosService, 'create').mockRejectedValueOnce(
        AppError.conflict('CREDITO_DUPLICADO', 'Ya existe una solicitud activa'),
      );

      const response = await request(app).post('/api/creditos').send({
        identificacionAsociado: '1001234567',
        nombreAsociado: 'Juan Pérez',
        tipoCredito: 'LIBRE_INVERSION',
        valorSolicitado: 15000000,
        tasaInteres: 1.5,
        numeroCuotas: 36,
        formaPago: 'NOMINA',
      });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('CREDITO_DUPLICADO');
    });
  });

  describe('POST /api/webhooks/receiver - Simulación y Verificación', () => {
    it('recibe y valida exitosamente el evento de webhook simulado', async () => {
      const response = await request(app)
        .post('/api/webhooks/receiver')
        .send({
          event: 'credito.creado',
          eventId: 'evt_test_123',
          timestamp: new Date().toISOString(),
          data: {
            id: 1,
            numeroCredito: 'CR-2026-000001',
            identificacionAsociado: '1001234567',
            valorSolicitado: 15000000,
            estado: 'SOLICITADO',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.received).toBe(true);
      expect(response.body.data.eventId).toBe('evt_test_123');
    });
  });
});
