export type TipoCredito =
  | 'LIBRE_INVERSION'
  | 'VIVIENDA'
  | 'EDUCATIVO'
  | 'VEHICULO'
  | 'CALAMIDAD'
  | 'COMERCIAL';

export type FormaPago = 'NOMINA' | 'VENTANILLA' | 'DEBITO_AUTOMATICO';

export type CreditoEstado =
  | 'SOLICITADO'
  | 'EN_ESTUDIO'
  | 'APROBADO'
  | 'RECHAZADO'
  | 'DESEMBOLSADO'
  | 'CANCELADO';

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

export interface CreateCreditoDto {
  identificacionAsociado: string;
  nombreAsociado: string;
  tipoCredito: TipoCredito;
  valorSolicitado: number;
  tasaInteres: number;
  numeroCuotas: number;
  formaPago: FormaPago;
}

export interface ChangeEstadoDto {
  estadoNuevo: CreditoEstado;
  usuario: string;
  observacion?: string;
}

export interface CreditosQueryParams {
  page?: number;
  pageSize?: number;
  estado?: CreditoEstado | '';
  identificacion?: string;
  q?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
