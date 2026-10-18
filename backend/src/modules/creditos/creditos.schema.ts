import { z } from 'zod';
import { ESTADOS_CREDITO, FORMAS_PAGO, TIPOS_CREDITO } from './creditos.types';

export const createCreditoSchema = z.object({
  identificacionAsociado: z
    .string()
    .trim()
    .min(5, 'La identificación debe tener al menos 5 caracteres')
    .max(20, 'La identificación no puede exceder 20 caracteres'),
  nombreAsociado: z
    .string()
    .trim()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(150, 'El nombre no puede exceder 150 caracteres'),
  tipoCredito: z.enum(TIPOS_CREDITO),
  valorSolicitado: z
    .coerce
    .number()
    .positive('El valor solicitado debe ser mayor a 0'),
  tasaInteres: z
    .coerce
    .number()
    .min(0, 'La tasa de interés debe ser mayor o igual a 0'),
  numeroCuotas: z
    .coerce
    .number()
    .int('El número de cuotas debe ser un número entero')
    .positive('El número de cuotas debe ser mayor a 0'),
  formaPago: z.enum(FORMAS_PAGO),
});

export const updateCreditoSchema = z.object({
  nombreAsociado: z.string().trim().min(3).max(150).optional(),
  formaPago: z.enum(FORMAS_PAGO).optional(),
  numeroCuotas: z.coerce.number().int().positive().optional(),
  tasaInteres: z.coerce.number().min(0).optional(),
  valorSolicitado: z.coerce.number().positive().optional(),
});

export const changeEstadoSchema = z.object({
  estadoNuevo: z.enum(ESTADOS_CREDITO),
  usuario: z.string().trim().min(2).max(100).default('USUARIO_OPERATIVO'),
  observacion: z.string().trim().max(500).optional(),
});

export const queryCreditosSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  estado: z.enum(ESTADOS_CREDITO).optional(),
  identificacion: z.string().trim().optional(),
  q: z.string().trim().optional(),
  sortBy: z.enum(['fechaSolicitud', 'valorSolicitado', 'numeroCredito', 'estado']).default('fechaSolicitud'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateCreditoInput = z.infer<typeof createCreditoSchema>;
export type UpdateCreditoInput = z.infer<typeof updateCreditoSchema>;
export type ChangeEstadoInput = z.infer<typeof changeEstadoSchema>;
export type QueryCreditosInput = z.infer<typeof queryCreditosSchema>;
