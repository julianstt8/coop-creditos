import { AppError } from '../../shared/errors/app-error';
import type { CreditoEstado } from './creditos.types';

/**
 * Matriz de transiciones de estado permitidas según las políticas de riesgo
 * y operación del sector financiero solidario.
 */
export const ALLOWED_TRANSITIONS: Record<CreditoEstado, readonly CreditoEstado[]> = {
  SOLICITADO: ['EN_ESTUDIO', 'CANCELADO'],
  EN_ESTUDIO: ['APROBADO', 'RECHAZADO', 'CANCELADO'],
  APROBADO: ['DESEMBOLSADO', 'CANCELADO'],
  RECHAZADO: [], // Terminal
  DESEMBOLSADO: [], // Terminal
  CANCELADO: [], // Terminal
};

/**
 * Valida si una transición de estado es válida según el ciclo de vida del crédito.
 * Lanza AppError 422 si la transición viola las reglas de negocio.
 */
export function assertValidStateTransition(current: CreditoEstado, next: CreditoEstado): void {
  if (current === next) {
    throw AppError.badRequest(
      'SAME_STATE',
      `El crédito ya se encuentra en estado ${current}.`,
    );
  }

  const allowed = ALLOWED_TRANSITIONS[current] ?? [];

  if (!allowed.includes(next)) {
    const allowedMsg =
      allowed.length > 0
        ? `Transiciones permitidas desde ${current}: ${allowed.join(', ')}.`
        : `El estado ${current} es terminal y no permite más cambios de estado.`;

    throw AppError.unprocessable(
      'INVALID_STATE_TRANSITION',
      `No se permite la transición de ${current} a ${next}. ${allowedMsg}`,
      { estadoActual: current, estadoDestino: next, transicionesPermitidas: allowed },
    );
  }
}

/**
 * En el sector financiero, solo se permite modificar condiciones financieras
 * de una solicitud mientras se encuentre en etapa de radicación o análisis (SOLICITADO o EN_ESTUDIO).
 * Una vez APROBADO, DESEMBOLSADO, RECHAZADO o CANCELADO, las condiciones son inmutables.
 */
export function assertCreditCanBeUpdated(estado: CreditoEstado): void {
  if (estado !== 'SOLICITADO' && estado !== 'EN_ESTUDIO') {
    throw AppError.conflict(
      'CREDITO_IMMUTABLE',
      `No se puede modificar un crédito en estado ${estado}. Las condiciones son inmutables una vez superada la etapa de estudio.`,
    );
  }
}

/**
 * Genera el identificador comercial de crédito con formato institucional:
 * CR-YYYY-XXXXXX (ej: CR-2026-000001)
 */
export function formatNumeroCredito(sequenceId: number, date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const sequencePadded = String(sequenceId).padStart(6, '0');
  return `CR-${year}-${sequencePadded}`;
}
