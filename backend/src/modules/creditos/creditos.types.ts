export const TIPOS_CREDITO = [
  'LIBRE_INVERSION',
  'VIVIENDA',
  'EDUCATIVO',
  'VEHICULO',
  'CALAMIDAD',
  'COMERCIAL',
] as const;
export type TipoCredito = (typeof TIPOS_CREDITO)[number];

export const FORMAS_PAGO = ['NOMINA', 'VENTANILLA', 'DEBITO_AUTOMATICO'] as const;
export type FormaPago = (typeof FORMAS_PAGO)[number];

export const ESTADOS_CREDITO = [
  'SOLICITADO',
  'EN_ESTUDIO',
  'APROBADO',
  'RECHAZADO',
  'DESEMBOLSADO',
  'CANCELADO',
] as const;
export type CreditoEstado = (typeof ESTADOS_CREDITO)[number];

export interface Credito {
  id: number;
  numeroCredito: string;
  idAsociado: number;
  identificacionAsociado: string;
  nombreAsociado: string;
  tipoCredito: TipoCredito;
  valorSolicitado: number;
  tasaInteres: number;
  numeroCuotas: number;
  formaPago: FormaPago;
  estado: CreditoEstado;
  fechaSolicitud: string;
  fechaActualizacion: string;
  isDeleted: boolean;
  deletedAt?: string | null;
}

export interface HistorialCredito {
  id: number;
  idCredito: number;
  estadoAnterior: CreditoEstado | null;
  estadoNuevo: CreditoEstado;
  usuario: string;
  observacion: string | null;
  fechaCambio: string;
}

export interface WebhookLog {
  id: number;
  eventId: string;
  idCredito: number;
  url: string;
  requestPayload: string;
  responseStatus: number | null;
  responseBody: string | null;
  exitoso: boolean;
  intentos: number;
  error: string | null;
  fechaCreacion: string;
}

export interface CreditoConDetalle extends Credito {
  historial: HistorialCredito[];
  webhookLogs: WebhookLog[];
}

export interface CreditoStats {
  totalCreditos: number;
  montoTotalCartera: number;
  porEstado: Record<CreditoEstado, { cantidad: number; monto: number }>;
}
