import crypto from 'node:crypto';
import { Router } from 'express';
import { env } from '../../config/env';
import { ok } from '../../shared/http/api-response';
import { logger } from '../../shared/logger';

export const webhookRouter = Router();

/**
 * Receptor simulado para pruebas locales o demostración.
 * Permite validar que el webhook enviado por la API sea recibido correctamente
 * y verificar la autenticidad de la firma HMAC.
 */
webhookRouter.post('/receiver', (req, res) => {
  const signatureHeader = req.header('x-webhook-signature');
  const eventId = req.header('x-webhook-event-id') || req.body?.eventId;

  let isValidSignature = false;
  if (signatureHeader && signatureHeader.startsWith('sha256=')) {
    const rawPayload = JSON.stringify(req.body);
    const expectedSig = crypto
      .createHmac('sha256', env.WEBHOOK_SECRET)
      .update(rawPayload)
      .digest('hex');
    const receivedSig = signatureHeader.replace('sha256=', '');
    isValidSignature = expectedSig === receivedSig;
  }

  logger.info(
    { eventId, isValidSignature, body: req.body },
    'Webhook recibido en endpoint simulador',
  );

  res.status(200).json(
    ok({
      received: true,
      eventId,
      signatureValidated: isValidSignature,
      message: 'Notificación de webhook procesada exitosamente por el receptor simulado.',
    }),
  );
});
