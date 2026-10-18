import sql from 'mssql';
import { getPool } from '../../config/database';
import { formatNumeroCredito } from './creditos.business';
import type {
  CreateCreditoInput,
  QueryCreditosInput,
  UpdateCreditoInput,
} from './creditos.schema';
import type {
  Credito,
  CreditoConDetalle,
  CreditoEstado,
  CreditoStats,
  HistorialCredito,
  WebhookLog,
} from './creditos.types';

function mapRowToCredito(row: any): Credito {
  return {
    id: row.id,
    numeroCredito: row.numeroCredito,
    idAsociado: row.idAsociado,
    identificacionAsociado: row.identificacionAsociado,
    nombreAsociado: row.nombreAsociado,
    tipoCredito: row.tipoCredito,
    valorSolicitado: Number(row.valorSolicitado),
    tasaInteres: Number(row.tasaInteres),
    numeroCuotas: Number(row.numeroCuotas),
    formaPago: row.formaPago,
    estado: row.estado,
    fechaSolicitud: row.fechaSolicitud instanceof Date ? row.fechaSolicitud.toISOString() : String(row.fechaSolicitud),
    fechaActualizacion:
      row.fechaActualizacion instanceof Date
        ? row.fechaActualizacion.toISOString()
        : String(row.fechaActualizacion),
    isDeleted: Boolean(row.isDeleted),
    deletedAt: row.deletedAt ? (row.deletedAt instanceof Date ? row.deletedAt.toISOString() : String(row.deletedAt)) : null,
  };
}

export class CreditosRepository {
  /**
   * Busca si existe una solicitud activa duplicada según las reglas de negocio.
   */
  async findDuplicate(
    identificacionAsociado: string,
    tipoCredito: string,
    valorSolicitado: number,
    numeroCuotas: number,
  ): Promise<Credito | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('identificacion', sql.NVarChar(20), identificacionAsociado)
      .input('tipoCredito', sql.VarChar(30), tipoCredito)
      .input('valor', sql.Decimal(18, 2), valorSolicitado)
      .input('cuotas', sql.Int, numeroCuotas).query(`
        SELECT TOP 1 *
        FROM dbo.Creditos
        WHERE identificacionAsociado = @identificacion
          AND isDeleted = 0
          AND estado IN ('SOLICITADO', 'EN_ESTUDIO')
          AND (
            tipoCredito = @tipoCredito
            OR (valorSolicitado = @valor AND numeroCuotas = @cuotas)
          )
        ORDER BY fechaSolicitud DESC
      `);

    return result.recordset.length > 0 ? mapRowToCredito(result.recordset[0]) : null;
  }

  /**
   * Busca o crea un asociado para garantizar integridad referencial.
   */
  private async findOrCreateAsociado(
    transaction: sql.Transaction,
    identificacion: string,
    nombreCompleto: string,
  ): Promise<number> {
    const request = new sql.Request(transaction);
    request.input('identificacion', sql.NVarChar(20), identificacion);
    request.input('nombreCompleto', sql.NVarChar(150), nombreCompleto);

    const check = await request.query(`
      SELECT id FROM dbo.Asociados WHERE identificacion = @identificacion
    `);

    if (check.recordset.length > 0) {
      return check.recordset[0].id;
    }

    const insertRequest = new sql.Request(transaction);
    insertRequest.input('identificacion', sql.NVarChar(20), identificacion);
    insertRequest.input('nombreCompleto', sql.NVarChar(150), nombreCompleto);

    const insert = await insertRequest.query(`
      INSERT INTO dbo.Asociados (identificacion, nombreCompleto, activo)
      OUTPUT INSERTED.id
      VALUES (@identificacion, @nombreCompleto, 1)
    `);

    return insert.recordset[0].id;
  }

  /**
   * Crea un crédito y registra la auditoría inicial de forma atómica.
   */
  async create(data: CreateCreditoInput, usuario = 'SISTEMA'): Promise<Credito> {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const idAsociado = await this.findOrCreateAsociado(
        transaction,
        data.identificacionAsociado,
        data.nombreAsociado,
      );

      // Calcular el siguiente consecutivo de crédito
      const countReq = new sql.Request(transaction);
      const countRes = await countReq.query<{ maxId: number | null }>(`
        SELECT ISNULL(MAX(id), 0) AS maxId FROM dbo.Creditos
      `);
      const nextSequence = (countRes.recordset[0]?.maxId ?? 0) + 1;
      const numeroCredito = formatNumeroCredito(nextSequence);

      const insertReq = new sql.Request(transaction);
      insertReq.input('numeroCredito', sql.VarChar(25), numeroCredito);
      insertReq.input('idAsociado', sql.Int, idAsociado);
      insertReq.input('identificacionAsociado', sql.NVarChar(20), data.identificacionAsociado);
      insertReq.input('nombreAsociado', sql.NVarChar(150), data.nombreAsociado);
      insertReq.input('tipoCredito', sql.VarChar(30), data.tipoCredito);
      insertReq.input('valorSolicitado', sql.Decimal(18, 2), data.valorSolicitado);
      insertReq.input('tasaInteres', sql.Decimal(5, 2), data.tasaInteres);
      insertReq.input('numeroCuotas', sql.Int, data.numeroCuotas);
      insertReq.input('formaPago', sql.VarChar(30), data.formaPago);

      const insertRes = await insertReq.query(`
        INSERT INTO dbo.Creditos (
          numeroCredito, idAsociado, identificacionAsociado, nombreAsociado, tipoCredito,
          valorSolicitado, tasaInteres, numeroCuotas, formaPago, estado
        )
        OUTPUT INSERTED.*
        VALUES (
          @numeroCredito, @idAsociado, @identificacionAsociado, @nombreAsociado, @tipoCredito,
          @valorSolicitado, @tasaInteres, @numeroCuotas, @formaPago, 'SOLICITADO'
        )
      `);

      const nuevoCredito = mapRowToCredito(insertRes.recordset[0]);

      // Registro de auditoría inicial (Append-Only)
      const auditReq = new sql.Request(transaction);
      auditReq.input('idCredito', sql.Int, nuevoCredito.id);
      auditReq.input('estadoNuevo', sql.VarChar(20), 'SOLICITADO');
      auditReq.input('usuario', sql.NVarChar(100), usuario);
      auditReq.input('observacion', sql.NVarChar(500), 'Radicación inicial del crédito');

      await auditReq.query(`
        INSERT INTO dbo.HistorialCredito (idCredito, estadoAnterior, estadoNuevo, usuario, observacion)
        VALUES (@idCredito, NULL, @estadoNuevo, @usuario, @observacion)
      `);

      await transaction.commit();
      return nuevoCredito;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Consulta créditos con paginación, filtros y ordenamiento.
   */
  async findAll(query: QueryCreditosInput): Promise<{ items: Credito[]; total: number }> {
    const pool = await getPool();
    const request = pool.request();

    const whereClauses: string[] = ['isDeleted = 0'];

    if (query.estado) {
      request.input('estado', sql.VarChar(20), query.estado);
      whereClauses.push('estado = @estado');
    }

    if (query.identificacion) {
      request.input('identificacion', sql.NVarChar(20), query.identificacion);
      whereClauses.push('identificacionAsociado = @identificacion');
    }

    if (query.q) {
      request.input('q', sql.NVarChar(150), `%${query.q}%`);
      whereClauses.push(
        '(numeroCredito LIKE @q OR nombreAsociado LIKE @q OR identificacionAsociado LIKE @q)',
      );
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Mapeo seguro de columnas para evitar inyecciones en ORDER BY
    const sortColumns: Record<string, string> = {
      fechaSolicitud: 'fechaSolicitud',
      valorSolicitado: 'valorSolicitado',
      numeroCredito: 'numeroCredito',
      estado: 'estado',
    };
    const sortCol = sortColumns[query.sortBy] ?? 'fechaSolicitud';
    const sortDir = query.sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const offset = (query.page - 1) * query.pageSize;
    request.input('offset', sql.Int, offset);
    request.input('limit', sql.Int, query.pageSize);

    const countRes = await request.query<{ total: number }>(`
      SELECT COUNT(1) AS total FROM dbo.Creditos ${whereSql}
    `);
    const total = countRes.recordset[0]?.total ?? 0;

    const itemsRes = await request.query(`
      SELECT *
      FROM dbo.Creditos
      ${whereSql}
      ORDER BY ${sortCol} ${sortDir}
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `);

    const items = itemsRes.recordset.map(mapRowToCredito);
    return { items, total };
  }

  /**
   * Obtiene un crédito por ID sin incluir eliminados lógicamente.
   */
  async findById(id: number): Promise<Credito | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM dbo.Creditos WHERE id = @id AND isDeleted = 0');

    return result.recordset.length > 0 ? mapRowToCredito(result.recordset[0]) : null;
  }

  /**
   * Obtiene el crédito con su historial de auditoría y traza de webhooks.
   */
  async findByIdWithDetail(id: number): Promise<CreditoConDetalle | null> {
    const credito = await this.findById(id);
    if (!credito) return null;

    const pool = await getPool();

    const [historialRes, webhookRes] = await Promise.all([
      pool
        .request()
        .input('idCredito', sql.Int, id)
        .query<HistorialCredito>(`
          SELECT id, idCredito, estadoAnterior, estadoNuevo, usuario, observacion,
                 CONVERT(VARCHAR(33), fechaCambio, 127) AS fechaCambio
          FROM dbo.HistorialCredito
          WHERE idCredito = @idCredito
          ORDER BY fechaCambio ASC
        `),
      pool
        .request()
        .input('idCredito', sql.Int, id)
        .query<WebhookLog>(`
          SELECT id, eventId, idCredito, url, requestPayload, responseStatus, responseBody,
                 exitoso, intentos, error, CONVERT(VARCHAR(33), fechaCreacion, 127) AS fechaCreacion
          FROM dbo.WebhookLogs
          WHERE idCredito = @idCredito
          ORDER BY fechaCreacion DESC
        `),
    ]);

    return {
      ...credito,
      historial: historialRes.recordset,
      webhookLogs: webhookRes.recordset,
    };
  }

  /**
   * Actualiza el estado del crédito y registra la auditoría atómicamente.
   */
  async changeEstado(
    id: number,
    estadoNuevo: CreditoEstado,
    usuario: string,
    observacion?: string,
  ): Promise<Credito> {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const getReq = new sql.Request(transaction);
      getReq.input('id', sql.Int, id);
      const currentRes = await getReq.query('SELECT * FROM dbo.Creditos WHERE id = @id AND isDeleted = 0');

      if (currentRes.recordset.length === 0) {
        throw new Error('NOT_FOUND');
      }

      const estadoAnterior = currentRes.recordset[0].estado;

      const updateReq = new sql.Request(transaction);
      updateReq.input('id', sql.Int, id);
      updateReq.input('estadoNuevo', sql.VarChar(20), estadoNuevo);

      const updatedRes = await updateReq.query(`
        UPDATE dbo.Creditos
        SET estado = @estadoNuevo,
            fechaActualizacion = SYSUTCDATETIME()
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

      const auditReq = new sql.Request(transaction);
      auditReq.input('idCredito', sql.Int, id);
      auditReq.input('estadoAnterior', sql.VarChar(20), estadoAnterior);
      auditReq.input('estadoNuevo', sql.VarChar(20), estadoNuevo);
      auditReq.input('usuario', sql.NVarChar(100), usuario);
      auditReq.input('observacion', sql.NVarChar(500), observacion ?? null);

      await auditReq.query(`
        INSERT INTO dbo.HistorialCredito (idCredito, estadoAnterior, estadoNuevo, usuario, observacion)
        VALUES (@idCredito, @estadoAnterior, @estadoNuevo, @usuario, @observacion)
      `);

      await transaction.commit();
      return mapRowToCredito(updatedRes.recordset[0]);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Actualiza datos modificables de un crédito.
   */
  async update(id: number, data: UpdateCreditoInput): Promise<Credito | null> {
    const pool = await getPool();
    const request = pool.request();
    request.input('id', sql.Int, id);

    const setClauses: string[] = ['fechaActualizacion = SYSUTCDATETIME()'];

    if (data.nombreAsociado !== undefined) {
      request.input('nombreAsociado', sql.NVarChar(150), data.nombreAsociado);
      setClauses.push('nombreAsociado = @nombreAsociado');
    }
    if (data.formaPago !== undefined) {
      request.input('formaPago', sql.VarChar(30), data.formaPago);
      setClauses.push('formaPago = @formaPago');
    }
    if (data.numeroCuotas !== undefined) {
      request.input('numeroCuotas', sql.Int, data.numeroCuotas);
      setClauses.push('numeroCuotas = @numeroCuotas');
    }
    if (data.tasaInteres !== undefined) {
      request.input('tasaInteres', sql.Decimal(5, 2), data.tasaInteres);
      setClauses.push('tasaInteres = @tasaInteres');
    }
    if (data.valorSolicitado !== undefined) {
      request.input('valorSolicitado', sql.Decimal(18, 2), data.valorSolicitado);
      setClauses.push('valorSolicitado = @valorSolicitado');
    }

    const result = await request.query(`
      UPDATE dbo.Creditos
      SET ${setClauses.join(', ')}
      OUTPUT INSERTED.*
      WHERE id = @id AND isDeleted = 0
    `);

    return result.recordset.length > 0 ? mapRowToCredito(result.recordset[0]) : null;
  }

  /**
   * Realiza un borrado lógico del crédito.
   */
  async softDelete(id: number): Promise<boolean> {
    const pool = await getPool();
    const result = await pool.request().input('id', sql.Int, id).query(`
      UPDATE dbo.Creditos
      SET isDeleted = 1,
          deletedAt = SYSUTCDATETIME(),
          fechaActualizacion = SYSUTCDATETIME()
      WHERE id = @id AND isDeleted = 0
    `);

    return (result.rowsAffected[0] ?? 0) > 0;
  }

  /**
   * Agrupa métricas y conteos por estado para el Dashboard financiero.
   */
  async getStats(): Promise<CreditoStats> {
    const pool = await getPool();
    const result = await pool.query<{
      estado: CreditoEstado;
      cantidad: number;
      monto: number;
    }>(`
      SELECT 
        estado,
        COUNT(1) AS cantidad,
        ISNULL(SUM(valorSolicitado), 0) AS monto
      FROM dbo.Creditos
      WHERE isDeleted = 0
      GROUP BY estado
    `);

    const porEstado: CreditoStats['porEstado'] = {
      SOLICITADO: { cantidad: 0, monto: 0 },
      EN_ESTUDIO: { cantidad: 0, monto: 0 },
      APROBADO: { cantidad: 0, monto: 0 },
      RECHAZADO: { cantidad: 0, monto: 0 },
      DESEMBOLSADO: { cantidad: 0, monto: 0 },
      CANCELADO: { cantidad: 0, monto: 0 },
    };

    let totalCreditos = 0;
    let montoTotalCartera = 0;

    for (const row of result.recordset) {
      porEstado[row.estado] = {
        cantidad: Number(row.cantidad),
        monto: Number(row.monto),
      };
      totalCreditos += Number(row.cantidad);
      montoTotalCartera += Number(row.monto);
    }

    return {
      totalCreditos,
      montoTotalCartera,
      porEstado,
    };
  }
}
