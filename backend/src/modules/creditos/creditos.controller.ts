import type { Request, Response } from 'express';
import { ok } from '../../shared/http/api-response';
import {
  changeEstadoSchema,
  createCreditoSchema,
  queryCreditosSchema,
  updateCreditoSchema,
} from './creditos.schema';
import { creditosService } from './creditos.service';

export class CreditosController {
  async create(req: Request, res: Response): Promise<void> {
    const data = createCreditoSchema.parse(req.body);
    const usuario = (req.header('x-usuario') || 'PORTAL_WEB').slice(0, 100);

    const nuevoCredito = await creditosService.create(data, usuario);
    res.status(201).json(ok(nuevoCredito));
  }

  async findAll(req: Request, res: Response): Promise<void> {
    const query = queryCreditosSchema.parse(req.query);
    const { items, total } = await creditosService.findAll(query);

    const totalPages = Math.ceil(total / query.pageSize) || 1;

    res.status(200).json(
      ok(items, {
        page: query.page,
        pageSize: query.pageSize,
        totalItems: total,
        totalPages,
      }),
    );
  }

  async getStats(_req: Request, res: Response): Promise<void> {
    const stats = await creditosService.getStats();
    res.status(200).json(ok(stats));
  }

  async findById(req: Request, res: Response): Promise<void> {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'El id de crédito debe ser un número entero positivo' },
      });
      return;
    }

    const credito = await creditosService.findById(id);
    res.status(200).json(ok(credito));
  }

  async update(req: Request, res: Response): Promise<void> {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'El id de crédito debe ser un número entero positivo' },
      });
      return;
    }

    const data = updateCreditoSchema.parse(req.body);
    const updated = await creditosService.update(id, data);
    res.status(200).json(ok(updated));
  }

  async changeEstado(req: Request, res: Response): Promise<void> {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'El id de crédito debe ser un número entero positivo' },
      });
      return;
    }

    const data = changeEstadoSchema.parse(req.body);
    const updated = await creditosService.changeEstado(id, data);
    res.status(200).json(ok(updated));
  }

  async softDelete(req: Request, res: Response): Promise<void> {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'El id de crédito debe ser un número entero positivo' },
      });
      return;
    }

    await creditosService.softDelete(id);
    res.status(200).json(ok({ deleted: true, id }));
  }
}

export const creditosController = new CreditosController();
