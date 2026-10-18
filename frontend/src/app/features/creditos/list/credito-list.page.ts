import { CommonModule, NgStyle } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { Credito, CreditoEstado } from '../../../core/models/credito.model';
import { CreditosService } from '../../../core/services/creditos.service';

@Component({
  selector: 'app-credito-list-page',
  standalone: true,
  imports: [CommonModule, NgStyle, FormsModule, RouterLink],
  template: `
    <!-- Tooltip global con position:fixed - nunca queda recortado por overflow -->
    <div class="tooltip-popup"
         [class.tooltip-visible]="tooltipVisible"
         [ngStyle]="{ top: tooltipY + 'px', left: tooltipX + 'px' }">
      {{ tooltipText }}
      <span class="tooltip-arrow"></span>
    </div>
    <div class="container animate-fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">Solicitudes de Crédito</h1>
          <p class="page-subtitle">Administración, filtros y seguimiento del ciclo de vida de créditos</p>
        </div>
        <div>
          <a routerLink="/creditos/nuevo" class="btn btn-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Nueva Solicitud</span>
          </a>
        </div>
      </div>

      @if (successMessage()) {
        <div class="alert alert-success">{{ successMessage() }}</div>
      }
      @if (errorMessage()) {
        <div class="alert alert-error">{{ errorMessage() }}</div>
      }

      <div class="card filters-card">
        <div class="filters-row">
          <div class="filter-item search-box">
            <label class="form-label" for="search-input">Buscar Solicitud</label>
            <div class="input-icon-wrapper">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="input-icon">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input id="search-input" type="text" class="form-control with-icon"
                placeholder="Número de crédito, cédula o nombre del asociado..."
                [(ngModel)]="searchTerm" (ngModelChange)="onSearchChange()" />
            </div>
          </div>
          <div class="filter-item">
            <label class="form-label" for="filter-estado">Filtrar por Estado</label>
            <select id="filter-estado" class="form-select" [(ngModel)]="selectedEstado" (ngModelChange)="onFilterChange()">
              <option value="">Todos los estados</option>
              <option value="SOLICITADO">Solicitado</option>
              <option value="EN_ESTUDIO">En Estudio</option>
              <option value="APROBADO">Aprobado</option>
              <option value="DESEMBOLSADO">Desembolsado</option>
              <option value="RECHAZADO">Rechazado</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </div>
          <div class="filter-item">
            <label class="form-label" for="filter-sort">Ordenar por</label>
            <select id="filter-sort" class="form-select" [(ngModel)]="sortBy" (ngModelChange)="onFilterChange()">
              <option value="fechaSolicitud">Fecha de radicación (recientes primero)</option>
              <option value="valorSolicitado">Monto solicitado</option>
              <option value="numeroCredito">Número de crédito</option>
              <option value="estado">Estado del credito</option>
            </select>
          </div>
        </div>
      </div>

      <div class="card table-card">
        @if (loading()) {
          <div class="loading-state">Consultando solicitudes de crédito...</div>
        } @else if (creditos().length === 0) {
          <div class="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="9" y1="15" x2="15" y2="15"></line>
            </svg>
            <h3>No se encontraron solicitudes registradas</h3>
            <p>Prueba cambiando los filtros de búsqueda o radica una nueva solicitud.</p>
            <a routerLink="/creditos/nuevo" class="btn btn-outline btn-sm">Radicar Nueva Solicitud</a>
          </div>
        } @else {
          <div class="table-wrapper">
            <table class="data-table compact-table">
              <colgroup>
                <col class="col-num">
                <col class="col-asociado">
                <col class="col-linea">
                <col class="col-monto">
                <col class="col-plazo">
                <col class="col-estado">
                <col class="col-fecha">
                <col class="col-acciones">
              </colgroup>
              <thead>
                <tr>
                  <th>No. Crédito</th>
                  <th>Asociado</th>
                  <th>Línea</th>
                  <th>Monto</th>
                  <th>Plazo / Pago</th>
                  <th>Estado</th>
                  <th>Radicación</th>
                  <th class="th-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (c of creditos(); track c.id) {
                  <tr>
                    <td
                      (mouseenter)="showTooltip($event, c.numeroCredito)"
                      (mouseleave)="hideTooltip()">
                      <a [routerLink]="['/creditos', c.id]" class="credit-num-link">{{ c.numeroCredito }}</a>
                    </td>
                    <td
                      (mouseenter)="showTooltip($event, c.nombreAsociado + ' · C.C. ' + c.identificacionAsociado)"
                      (mouseleave)="hideTooltip()">
                      <div class="asociado-nombre">{{ c.nombreAsociado }}</div>
                      <div class="asociado-cedula">{{ c.identificacionAsociado }}</div>
                    </td>
                    <td
                      (mouseenter)="showTooltip($event, formatTipo(c.tipoCredito))"
                      (mouseleave)="hideTooltip()">
                      <span class="tipo-label">{{ formatTipo(c.tipoCredito) }}</span>
                    </td>
                    <td class="monto-cell"
                      (mouseenter)="showTooltip($event, formatCurrency(c.valorSolicitado))"
                      (mouseleave)="hideTooltip()">{{ formatCurrency(c.valorSolicitado) }}</td>
                    <td
                      (mouseenter)="showTooltip($event, c.numeroCuotas + ' cuotas · ' + formatFormaPago(c.formaPago))"
                      (mouseleave)="hideTooltip()">
                      <div class="plazo-cuotas">{{ c.numeroCuotas }} cuotas</div>
                      <div class="plazo-forma">{{ formatFormaPago(c.formaPago) }}</div>
                    </td>
                    <td
                      (mouseenter)="showTooltip($event, 'Estado: ' + formatEstado(c.estado))"
                      (mouseleave)="hideTooltip()">
                      <span class="badge badge-{{ c.estado.toLowerCase() }}">{{ formatEstado(c.estado) }}</span>
                    </td>
                    <td class="fecha-cell"
                      (mouseenter)="showTooltip($event, formatDate(c.fechaSolicitud))"
                      (mouseleave)="hideTooltip()">{{ formatDate(c.fechaSolicitud) }}</td>
                    <td class="td-center">
                      <div class="table-actions">
                        <a [routerLink]="['/creditos', c.id]" class="btn btn-outline btn-sm"
                          (mouseenter)="showTooltip($event, 'Ver detalle: ' + c.numeroCredito)"
                          (mouseleave)="hideTooltip()">Detalle</a>
                        <button (click)="confirmDelete(c)" class="btn btn-outline btn-sm btn-delete"
                          (mouseenter)="showTooltip($event, 'Eliminar: ' + c.numeroCredito)"
                          (mouseleave)="hideTooltip()">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <div class="pagination-footer">
            <span class="pagination-info">
              Página <strong>{{ currentPage() }}</strong> de <strong>{{ totalPages() }}</strong>
              · {{ totalItems() }} solicitudes
            </span>
            <div class="pagination-controls">
              <button class="btn btn-outline btn-sm" [disabled]="currentPage() <= 1" (click)="goToPage(currentPage() - 1)">
                ← Anterior
              </button>
              <button class="btn btn-outline btn-sm" [disabled]="currentPage() >= totalPages()" (click)="goToPage(currentPage() + 1)">
                Siguiente →
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .filters-card { padding: 16px 20px; }
    .filters-row { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 16px; }
    .filter-item { flex: 1 1 200px; }
    .filter-item.search-box { flex: 2 1 320px; }
    .input-icon-wrapper { position: relative; display: flex; align-items: center; }
    .input-icon { position: absolute; left: 12px; color: var(--color-text-muted); pointer-events: none; }
    .form-control.with-icon { padding-left: 36px; }

    .loading-state { padding: 40px; text-align: center; color: var(--color-text-muted); }
    .empty-state { padding: 50px 20px; text-align: center; }
    .empty-state h3 { margin: 12px 0 6px; color: var(--color-text); }
    .empty-state p { margin: 0 0 16px; color: var(--color-text-muted); font-size: 0.9rem; }

    .table-card { margin-top: 20px; padding: 0; overflow: hidden; }
    .table-wrapper { width: 100%; overflow-x: auto; }

    .compact-table { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 0.81rem; }
    .compact-table th { padding: 10px 8px; font-size: 0.73rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    /* overflow:visible en td para que los tooltips (::after) no queden recortados */
    .compact-table td { padding: 9px 8px; vertical-align: middle; overflow: visible; }
    /* Elevar la fila al hacer hover para que su tooltip quede por encima de las demás */
    .compact-table tbody tr { position: relative; z-index: 1; }
    .compact-table tbody tr:hover { z-index: 20; }

    col.col-num      { width: 106px; }
    col.col-asociado { width: 18%;   }
    col.col-linea    { width: 10%;   }
    col.col-monto    { width: 110px; }
    col.col-plazo    { width: 105px; }
    col.col-estado   { width: 104px; }
    col.col-fecha    { width: 86px;  }
    col.col-acciones { width: 106px; }

    .th-center, .td-center { text-align: center; }

    .credit-num-link { font-family: var(--font-mono); font-weight: 700; font-size: 0.79rem; text-decoration: none; color: var(--color-primary); white-space: nowrap; }
    .credit-num-link:hover { text-decoration: underline; }

    .asociado-nombre { font-weight: 600; font-size: 0.81rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .asociado-cedula { font-size: 0.7rem; color: var(--color-text-muted); font-family: var(--font-mono); white-space: nowrap; }

    .tipo-label { font-size: 0.7rem; background: #f1f5f9; padding: 2px 6px; border-radius: var(--radius-sm); color: var(--color-text-secondary); font-weight: 500; white-space: nowrap; display: inline-block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }

    .monto-cell { font-weight: 700; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.81rem; }
    .plazo-cuotas { font-size: 0.79rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .plazo-forma { font-size: 0.69rem; color: var(--color-text-muted); white-space: nowrap; }
    .fecha-cell { font-size: 0.76rem; color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .table-actions { display: inline-flex; align-items: center; gap: 4px; justify-content: center; }
    .btn-delete:hover { color: #ef4444; border-color: #fca5a5; background: #fef2f2; }

    /* ── Tooltip global (position:fixed, nunca recortado) ── */
    .tooltip-popup {
      position: fixed;
      transform: translateX(-50%) translateY(-100%);
      margin-top: -10px;
      background: #1e293b;
      color: #f8fafc;
      font-size: 0.72rem;
      font-weight: 500;
      padding: 5px 12px;
      border-radius: 6px;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.15s ease;
      z-index: 9999;
      white-space: nowrap;
      box-shadow: 0 4px 14px rgba(0,0,0,0.3);
      line-height: 1.4;
    }
    .tooltip-popup.tooltip-visible {
      opacity: 1;
    }
    .tooltip-arrow {
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 5px solid transparent;
      border-top-color: #1e293b;
    }

    .pagination-footer { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; border-top: 1px solid var(--color-border); background: #fafafa; font-size: 0.82rem; }
    .pagination-info { color: var(--color-text-muted); }
    .pagination-controls { display: flex; gap: 8px; }
  `],
})
export class CreditoListPage implements OnInit {
  private readonly creditosService = inject(CreditosService);

  // ── Estado del tooltip global ──
  tooltipVisible = false;
  tooltipText = '';
  tooltipX = 0;
  tooltipY = 0;

  showTooltip(event: MouseEvent, text: string): void {
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    this.tooltipText = text;
    this.tooltipX = rect.left + rect.width / 2;
    this.tooltipY = rect.top - 6;
    this.tooltipVisible = true;
  }

  hideTooltip(): void {
    this.tooltipVisible = false;
  }

  readonly creditos = signal<Credito[]>([]);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  searchTerm = '';
  selectedEstado: CreditoEstado | '' = '';
  sortBy = 'fechaSolicitud';

  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly totalItems = signal(0);
  readonly totalPages = signal(1);

  ngOnInit(): void {
    this.loadCreditos();
  }

  loadCreditos(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.creditosService
      .findAll({
        page: this.currentPage(),
        pageSize: this.pageSize(),
        estado: this.selectedEstado || undefined,
        q: this.searchTerm.trim() || undefined,
        sortBy: this.sortBy,
        sortOrder: 'desc',
      })
      .subscribe({
        next: (response) => {
          this.creditos.set(response.data);
          if (response.meta) {
            this.totalItems.set(response.meta.totalItems);
            this.totalPages.set(response.meta.totalPages);
          }
          this.loading.set(false);
        },
        error: (err: any) => {
          this.errorMessage.set(err?.message || 'Error al consultar las solicitudes de crédito.');
          this.loading.set(false);
        },
      });
  }

  onSearchChange(): void { this.currentPage.set(1); this.loadCreditos(); }
  onFilterChange(): void { this.currentPage.set(1); this.loadCreditos(); }
  goToPage(page: number): void { this.currentPage.set(page); this.loadCreditos(); }

  confirmDelete(credito: Credito): void {
    const confirmed = confirm(
      `¿Está seguro de eliminar lógicamente el crédito ${credito.numeroCredito} del asociado ${credito.nombreAsociado}?`
    );
    if (!confirmed) return;
    this.creditosService.delete(credito.id).subscribe({
      next: () => {
        this.successMessage.set(`Crédito ${credito.numeroCredito} eliminado del sistema.`);
        setTimeout(() => this.successMessage.set(null), 4000);
        this.loadCreditos();
      },
      error: (err: any) => {
        this.errorMessage.set(err?.message || 'No fue posible eliminar la solicitud.');
      },
    });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
  }

  formatDate(dateStr: string): string {
    return new Intl.DateTimeFormat('es-CO', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(dateStr));
  }

  formatTipo(tipo: string): string {
    const map: Record<string, string> = {
      LIBRE_INVERSION: 'Libre Inversión', VIVIENDA: 'Vivienda', EDUCATIVO: 'Educativo',
      VEHICULO: 'Vehículo', CALAMIDAD: 'Calamidad', COMERCIAL: 'Comercial Solidario',
    };
    return map[tipo] || tipo.replace(/_/g, ' ');
  }

  formatFormaPago(fp: string): string {
    const map: Record<string, string> = { NOMINA: 'Nómina', DEBITO_AUTOMATICO: 'Débito Automático', VENTANILLA: 'Ventanilla' };
    return map[fp] || fp.replace(/_/g, ' ');
  }

  formatEstado(estado: string): string {
    const map: Record<string, string> = {
      SOLICITADO: 'Solicitado', EN_ESTUDIO: 'En Estudio', APROBADO: 'Aprobado',
      DESEMBOLSADO: 'Desembolsado', RECHAZADO: 'Rechazado', CANCELADO: 'Cancelado',
    };
    return map[estado] || estado.replace(/_/g, ' ');
  }
}
