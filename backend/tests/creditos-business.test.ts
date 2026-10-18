import { AppError } from '../src/shared/errors/app-error';
import {
  assertCreditCanBeUpdated,
  assertValidStateTransition,
  formatNumeroCredito,
} from '../src/modules/creditos/creditos.business';

describe('Reglas de Negocio de Créditos', () => {
  describe('assertValidStateTransition', () => {
    it('permite transiciones válidas del flujo estándar', () => {
      expect(() => assertValidStateTransition('SOLICITADO', 'EN_ESTUDIO')).not.toThrow();
      expect(() => assertValidStateTransition('EN_ESTUDIO', 'APROBADO')).not.toThrow();
      expect(() => assertValidStateTransition('EN_ESTUDIO', 'RECHAZADO')).not.toThrow();
      expect(() => assertValidStateTransition('APROBADO', 'DESEMBOLSADO')).not.toThrow();
      expect(() => assertValidStateTransition('SOLICITADO', 'CANCELADO')).not.toThrow();
    });

    it('bloquea pasar de RECHAZADO a DESEMBOLSADO con error 422', () => {
      expect(() => assertValidStateTransition('RECHAZADO', 'DESEMBOLSADO')).toThrow(AppError);
      try {
        assertValidStateTransition('RECHAZADO', 'DESEMBOLSADO');
      } catch (err: any) {
        expect(err.statusCode).toBe(422);
        expect(err.code).toBe('INVALID_STATE_TRANSITION');
      }
    });

    it('bloquea transicionar desde un estado terminal (DESEMBOLSADO, CANCELADO)', () => {
      expect(() => assertValidStateTransition('DESEMBOLSADO', 'SOLICITADO')).toThrow(AppError);
      expect(() => assertValidStateTransition('CANCELADO', 'EN_ESTUDIO')).toThrow(AppError);
    });

    it('bloquea transicionar hacia el mismo estado', () => {
      expect(() => assertValidStateTransition('SOLICITADO', 'SOLICITADO')).toThrow(AppError);
      try {
        assertValidStateTransition('SOLICITADO', 'SOLICITADO');
      } catch (err: any) {
        expect(err.statusCode).toBe(400);
        expect(err.code).toBe('SAME_STATE');
      }
    });
  });

  describe('assertCreditCanBeUpdated', () => {
    it('permite modificar en SOLICITADO y EN_ESTUDIO', () => {
      expect(() => assertCreditCanBeUpdated('SOLICITADO')).not.toThrow();
      expect(() => assertCreditCanBeUpdated('EN_ESTUDIO')).not.toThrow();
    });

    it('bloquea modificación en estados avanzados o terminales', () => {
      expect(() => assertCreditCanBeUpdated('APROBADO')).toThrow(AppError);
      expect(() => assertCreditCanBeUpdated('DESEMBOLSADO')).toThrow(AppError);
      expect(() => assertCreditCanBeUpdated('RECHAZADO')).toThrow(AppError);
    });
  });

  describe('formatNumeroCredito', () => {
    it('genera el formato estándar CR-YYYY-XXXXXX', () => {
      const fixedDate = new Date('2026-05-10T12:00:00Z');
      expect(formatNumeroCredito(1, fixedDate)).toBe('CR-2026-000001');
      expect(formatNumeroCredito(142, fixedDate)).toBe('CR-2026-000142');
      expect(formatNumeroCredito(999999, fixedDate)).toBe('CR-2026-999999');
    });
  });
});
