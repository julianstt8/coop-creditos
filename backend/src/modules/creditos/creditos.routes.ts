import { Router } from 'express';
import { creditosController } from './creditos.controller';

export const creditosRouter = Router();

// Métricas de Dashboard (debe ir antes de /:id para evitar colisión de rutas)
creditosRouter.get('/stats', (req, res, next) => {
  creditosController.getStats(req, res).catch(next);
});

// CRUD de Créditos
creditosRouter.post('/', (req, res, next) => {
  creditosController.create(req, res).catch(next);
});

creditosRouter.get('/', (req, res, next) => {
  creditosController.findAll(req, res).catch(next);
});

creditosRouter.get('/:id', (req, res, next) => {
  creditosController.findById(req, res).catch(next);
});

creditosRouter.put('/:id', (req, res, next) => {
  creditosController.update(req, res).catch(next);
});

creditosRouter.patch('/:id', (req, res, next) => {
  creditosController.update(req, res).catch(next);
});

creditosRouter.patch('/:id/estado', (req, res, next) => {
  creditosController.changeEstado(req, res).catch(next);
});

creditosRouter.delete('/:id', (req, res, next) => {
  creditosController.softDelete(req, res).catch(next);
});
