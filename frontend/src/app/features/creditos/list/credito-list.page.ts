import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { Credito, CreditoEstado } from '../../../core/models/credito.model';
import { CreditosService } from '../../../core/services/creditos.service';

@Component({
  selector: 'app-credito-list-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
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

      <!-- Alerta de Éxito / Error -->
      @if (successMessage()) {
        <div class="alert alert-success">
          {{ successMessage() }}
        </div>
      }
      @if (errorMessage()) {
        <div class="alert alert-error">
          {{ errorMessage() }}
        </div>
      }

      <!-- Filtros y Búsqueda -->
      <div class="card filters-card">
        <div class="filters-row">
          <div class="filter-item search-box">
            <label class="form-label" for="search-input">Buscar Solicitud</label>
            <div class="input-icon-wrapper">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="input-icon">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                id="search-input"
                type="text"
                class="form-control with-icon"
                placeholder="Número de crédito, cédula o nombre del asociado..."
                [(ngModel)]="searchTerm"
                (ngModelChange)="onSearchChange()"
              />
            </div>
          </div>

          <div class="filter-item">
            <label class="form-label" for="filter-estado">Filtrar por Estado</label>
            <select
              id="filter-estado"
              class="form-select"
              [(ngModel)]="selectedEstado"
              (ngModelChange)="onFilterChange()"
            >
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
            <select
              id="filter-sort"
              class="form-select"
              [(ngModel)]="sortBy"
              (ngModelChange)="onFilterChange()"
            >
              <option value="fechaSolicitud">Fecha de radicación (recientes primero)</option>
              <option value="valorSolicitado">Monto solicitado</option>
              <option value="numeroCredito">Número de crédito</option>
              <option value="estado">Estado del crédito</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Tabla de Créditos -->
      <div class="card" style="margin-top: 20px;">
        @if (loading()) {
          <div style="padding: 40px; text-align: center; color: var(--color-text-muted);">
            Consultando solicitudes de crédito...
          </div>
        } @else if (creditos().length === 0) {
          <div style="padding: 50px 20px; text-align: center;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" style="margin-bottom: 12px;">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="9" y1="15" x2="15" y2="15"></line>
            </svg>
            <h3 style="margin: 0; color: var(--color-text);">No se encontraron solicitudes registradas</h3>
            <p style="margin: 6px 0 16px 0; color: var(--color-text-muted); font-size: 0.9rem;">
              Prueba cambiando los filtros de búsqueda o radica una nueva solicitud.
            </p>
            <a routerLink="/creditos/nuevo" class="btn btn-outline btn-sm">Radicar Nueva Solicitud</a>
          </div>
        } @else {
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>No. Crédito</th>
                  <th>Asociado Titular</th>
                  <th>Línea de Crédito</th>
                  <th>Monto Solicitado</th>
                  <th>Plazo y Forma de Pago</th>
                  <th>Estado</th>
                  <th>Fecha Radicación</th>
                  <th style="text-align: right;">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (c of creditos(); track c.id) {
                  <tr>
                    <td>
                      <a [routerLink]="['/creditos', c.id]" class="font-mono font-bold" style="font-weight: 700;">
                        {{ c.numeroCredito }}
                      </a>
                    </td>
                    <td>
                      <div style="font-weight: 600;">{{ c.nombreAsociado }}</div>
                      <div style="font-size: 0.78rem; color: var(--color-text-muted); font-family: var(--font-mono);">
                        Cédula: {{ c.identificacionAsociado }}
                      </div>
                    </td>
                    <td>
                      <span class="tipo-label">{{ formatTipo(c.tipoCredito) }}</span>
                    </td>
                    <td style="font-weight: 700; color: var(--color-text);">
                      {{ formatCurrency(c.valorSolicitado) }}
                    </td>
                    <td>
                      <div style="font-size: 0.85rem;">{{ c.numeroCuotas }} cuotas mensuales</div>
                      <div style="font-size: 0.75rem; color: var(--color-text-muted);">{{ formatFormaPago(c.formaPago) }}</div>
                    </td>
                    <td>
                      <span class="badge badge-{{ c.estado.toLowerCase() }}">{{ formatEstado(c.estado) }}</span>
                    </td>
                    <td style="font-size: 0.82rem; color: var(--color-text-muted);">
                      {{ formatDate(c.fechaSolicitud) }}
                    </td>
                    <td style="text-align: right;">
                      <div class="table-actions">
                        <a [routerLink]="['/creditos', c.id]" class="btn btn-outline btn-sm">
                          Ver Detalle
                        </a>
                        <button
                          (click)="confirmDelete(c)"
                          class="btn btn-outline btn-sm btn-delete"
                          title="Eliminar crédito (borrado lógico)"
                        >
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

          <!-- Paginador -->
          <div class="pagination-footer">
            <span class="pagination-info">
              Mostrando página <strong>{{ currentPage() }}</strong> de <strong>{{ totalPages() }}</strong>
              ({{ totalItems() }} solicitudes en total)
            </span>
            <div class="pagination-controls">
              <button
                class="btn btn-outline btn-sm"
                [disabled]="currentPage() <= 1"
                (click)="goToPage(currentPage() - 1)"
              >
                ← Anterior
              </button>
              <button
                class="btn btn-outline btn-sm"
                [disabled]="currentPage() >= totalPages()"
                (click)="goToPage(currentPage() + 1)"
              >
                Siguiente →
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .filters-card {
        padding: 16px 20px;
      }

      .filters-row {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-end;
        gap: 16px;
      }

      .filter-item {
        flex: 1 1 200px;
      }

      .filter-item.search-box {
        flex: 2 1 320px;
      }

      .input-icon-wrapper {
        position: relative;
        display: flex;
        align-items: center;
      }

      .input-icon {
        position: absolute;
        left: 12px;
        color: var(--color-text-muted);
        pointer-events: none;
      }

      .form-control.with-icon {
        padding-left: 36px;
      }

      .tipo-label {
        font-size: 0.82rem;
        background: #f1f5f9;
        padding: 3px 8px;
        border-radius: var(--radius-sm);
        color: var(--color-text-secondary);
        font-weight: 500;
      }

      .table-actions {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }

      .btn-delete:hover {
        color: #ef4444;
        border-color: #fca5a5;
        background: #fef2f2;
      }

      .pagination-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 20px;
        border-top: 1px solid var(--color-border);
        background: #fafafa;
        font-size: 0.85rem;
      }

      .pagination-info {
        color: var(--color-text-muted);
      }

      .pagination-controls {
        display: flex;
        gap: 8px;
      }
    `,
  ],
})
export class CreditoListPage implements OnInit {
  private readonly creditosService = inject(CreditosService);

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

  onSearchChange(): void {
    this.currentPage.set(1);
    this.loadCreditos();
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.loadCreditos();
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
    this.loadCreditos();
  }

  confirmDelete(credito: Credito): void {
    const confirmed = confirm(
      `¿Está seguro de eliminar lógicamente el crédito ${credito.numeroCredito} del asociado ${credito.nombreAsociado}?`,
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
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(value);
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  }

  formatTipo(tipo: string): string {
    const map: Record<string, string> = {
      LIBRE_INVERSION: 'Libre Inversión',
      VIVIENDA: 'Vivienda',
      EDUCATIVO: 'Educativo',
      VEHICULO: 'Vehículo',
      CALAMIDAD: 'Calamidad',
      COMERCIAL: 'Comercial Solidario',
    };
    return map[tipo] || tipo.replace(/_/g, ' ');
  }

  formatFormaPago(fp: string): string {
    const map: Record<string, string> = {
      NOMINA: 'Nómina',
      DEBITO_AUTOMATICO: 'Débito Automático',
      VENTANILLA: 'Ventanilla',
    };
    return map[fp] || fp.replace(/_/g, ' ');
  }

  formatEstado(estado: string): string {
    return estado.replace(/_/g, ' ');
  }
}
