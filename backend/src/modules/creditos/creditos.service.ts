import { AppError } from '../../shared/errors/app-error';
import { webhookService } from '../webhooks/webhook.service';
import { assertCreditCanBeUpdated, assertValidStateTransition } from './creditos.business';
import { CreditosRepository } from './creditos.repository';
import type {
  ChangeEstadoInput,
  CreateCreditoInput,
  QueryCreditosInput,
  UpdateCreditoInput,
} from './creditos.schema';
import type {
  Credito,
  CreditoConDetalle,
  CreditoStats,
} from './creditos.types';

export class CreditosService {
  constructor(private readonly repository = new CreditosRepository()) {}

  /**
   * Registra una nueva solicitud de crédito aplicando validaciones y reglas de negocio:
   * 1. Verifica duplicados activos.
   * 2. Inserta el crédito y su auditoría inicial atómicamente.
   * 3. Dispara la notificación por Webhook sin bloquear la respuesta.
   */
  async create(data: CreateCreditoInput, usuario = 'SISTEMA'): Promise<Credito> {
    // 1. Control de duplicados
    const duplicado = await this.repository.findDuplicate(
      data.identificacionAsociado,
      data.tipoCredito,
      data.valorSolicitado,
      data.numeroCuotas,
    );

    if (duplicado) {
      throw AppError.conflict(
        'CREDITO_DUPLICADO',
        `Ya existe una solicitud activa (${duplicado.numeroCredito} en estado ${duplicado.estado}) para el asociado con el mismo tipo de crédito o condiciones similares.`,
      );
    }

    // 2. Persistencia en base de datos
    const nuevoCredito = await this.repository.create(data, usuario);

    // 3. Notificación externa por Webhook (asíncrona y no bloqueante)
    // Se ejecuta en segundo plano sin retrasar ni hacer fallar la respuesta HTTP del cliente
    setImmediate(() => {
      webhookService.notifyCreditoCreado(nuevoCredito).catch(() => {
        // El servicio de webhook ya captura y persiste los errores en WebhookLogs
      });
    });

    return nuevoCredito;
  }

  /**
   * Consulta créditos con paginación y filtros.
   */
  async findAll(query: QueryCreditosInput): Promise<{ items: Credito[]; total: number }> {
    return this.repository.findAll(query);
  }

  /**
   * Obtiene el detalle completo del crédito con historial y logs de webhook.
   */
  async findById(id: number): Promise<CreditoConDetalle> {
    const credito = await this.repository.findByIdWithDetail(id);
    if (!credito) {
      throw AppError.notFound('CREDITO_NOT_FOUND', 'El crédito solicitado no existe');
    }
    return credito;
  }

  /**
   * Ejecuta una transición de estado validada por la máquina de estados.
   */
  async changeEstado(id: number, input: ChangeEstadoInput): Promise<Credito> {
    const actual = await this.repository.findById(id);
    if (!actual) {
      throw AppError.notFound('CREDITO_NOT_FOUND', 'El crédito solicitado no existe');
    }

    // Validar máquina de estados
    assertValidStateTransition(actual.estado, input.estadoNuevo);

    return this.repository.changeEstado(
      id,
      input.estadoNuevo,
      input.usuario,
      input.observacion,
    );
  }

  /**
   * Actualiza las condiciones de un crédito solo si se encuentra en etapas editables.
   */
  async update(id: number, input: UpdateCreditoInput): Promise<Credito> {
    const actual = await this.repository.findById(id);
    if (!actual) {
      throw AppError.notFound('CREDITO_NOT_FOUND', 'El crédito solicitado no existe');
    }

    // Validar inmutabilidad financiera
    assertCreditCanBeUpdated(actual.estado);

    const actualizado = await this.repository.update(id, input);
    if (!actualizado) {
      throw AppError.notFound('CREDITO_NOT_FOUND', 'El crédito solicitado no existe');
    }

    return actualizado;
  }

  /**
   * Realiza un borrado lógico del crédito.
   */
  async softDelete(id: number): Promise<void> {
    const actual = await this.repository.findById(id);
    if (!actual) {
      throw AppError.notFound('CREDITO_NOT_FOUND', 'El crédito solicitado no existe');
    }

    await this.repository.softDelete(id);
  }

  /**
   * Obtiene métricas agregadas para el dashboard.
   */
  async getStats(): Promise<CreditoStats> {
    return this.repository.getStats();
  }
}

export const creditosService = new CreditosService();
