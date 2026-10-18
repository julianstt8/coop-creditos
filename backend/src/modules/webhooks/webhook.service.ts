import crypto from 'node:crypto';
import sql from 'mssql';
import { getPool } from '../../config/database';
import { env } from '../../config/env';
import { logger } from '../../shared/logger';
import type { Credito } from '../creditos/creditos.types';

export interface WebhookPayload {
  event: string;
  eventId: string;
  timestamp: string;
  data: {
    id: number;
    numeroCredito: string;
    identificacionAsociado: string;
    valorSolicitado: number;
    estado: string;
  };
}

export class WebhookService {
  /**
   * Genera la firma criptográfica HMAC-SHA256 para autenticar el payload ante el receptor.
   */
  generateSignature(payloadString: string): string {
    return crypto.createHmac('sha256', env.WEBHOOK_SECRET).update(payloadString).digest('hex');
  }

  /**
   * Notifica de forma asíncrona y no bloqueante la creación de un crédito.
   * Si el sistema externo no responde o falla, la solicitud de crédito NO se revierte,
   * y queda traza del fallo en la tabla WebhookLogs.
   */
  async notifyCreditoCreado(credito: Credito): Promise<void> {
    const eventId = `evt_${crypto.randomUUID()}`;
    const timestamp = new Date().toISOString();

    const payload: WebhookPayload = {
      event: 'credito.creado',
      eventId,
      timestamp,
      data: {
        id: credito.id,
        numeroCredito: credito.numeroCredito,
        identificacionAsociado: credito.identificacionAsociado,
        valorSolicitado: credito.valorSolicitado,
        estado: credito.estado,
      },
    };

    const payloadString = JSON.stringify(payload);
    const signature = this.generateSignature(payloadString);

    let responseStatus: number | null = null;
    let responseBody: string | null = null;
    let errorDesc: string | null = null;
    let exitoso = false;

    try {
      logger.info({ eventId, creditoId: credito.id, url: env.WEBHOOK_URL }, 'Despachando webhook');

      const response = await fetch(env.WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': `sha256=${signature}`,
          'X-Webhook-Event': 'credito.creado',
          'X-Webhook-Event-Id': eventId,
        },
        body: payloadString,
        signal: AbortSignal.timeout(env.WEBHOOK_TIMEOUT_MS),
      });

      responseStatus = response.status;
      const text = await response.text();
      responseBody = text.slice(0, 2000); // Guardar máximo 2KB de respuesta

      if (response.ok) {
        exitoso = true;
        logger.info({ eventId, status: responseStatus }, 'Webhook entregado exitosamente');
      } else {
        errorDesc = `El receptor respondió con HTTP ${responseStatus}`;
        logger.warn({ eventId, status: responseStatus, responseBody }, 'Webhook rechazado por receptor');
      }
    } catch (err: any) {
      errorDesc = err?.message || 'Error desconocido al conectar con receptor';
      logger.error({ eventId, err: errorDesc }, 'Fallo de conexión en despacho de webhook');
    } finally {
      // Registrar traza en la base de datos de manera resiliente
      await this.saveLog({
        eventId,
        idCredito: credito.id,
        url: env.WEBHOOK_URL,
        requestPayload: payloadString,
        responseStatus,
        responseBody,
        exitoso,
        intentos: 1,
        error: errorDesc,
      });
    }
  }

  /**
   * Persiste la traza del envío en la tabla WebhookLogs.
   */
  private async saveLog(log: {
    eventId: string;
    idCredito: number;
    url: string;
    requestPayload: string;
    responseStatus: number | null;
    responseBody: string | null;
    exitoso: boolean;
    intentos: number;
    error: string | null;
  }): Promise<void> {
    try {
      const pool = await getPool();
      await pool
        .request()
        .input('eventId', sql.VarChar(64), log.eventId)
        .input('idCredito', sql.Int, log.idCredito)
        .input('url', sql.NVarChar(500), log.url)
        .input('requestPayload', sql.NVarChar(sql.MAX), log.requestPayload)
        .input('responseStatus', sql.Int, log.responseStatus)
        .input('responseBody', sql.NVarChar(sql.MAX), log.responseBody)
        .input('exitoso', sql.Bit, log.exitoso ? 1 : 0)
        .input('intentos', sql.Int, log.intentos)
        .input('error', sql.NVarChar(sql.MAX), log.error).query(`
          INSERT INTO dbo.WebhookLogs (
            eventId, idCredito, url, requestPayload, responseStatus, responseBody, exitoso, intentos, error
          )
          VALUES (
            @eventId, @idCredito, @url, @requestPayload, @responseStatus, @responseBody, @exitoso, @intentos, @error
          )
        `);
    } catch (dbError) {
      logger.error({ err: dbError, eventId: log.eventId }, 'Error al guardar log de webhook en base de datos');
    }
  }
}

export const webhookService = new WebhookService();
