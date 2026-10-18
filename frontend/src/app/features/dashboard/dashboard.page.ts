import { CommonModule } from "@angular/common";
import { Component, inject, OnInit, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import type {
  CreditoEstado,
  CreditoStats,
} from "../../core/models/credito.model";
import { CreditosService } from "../../core/services/creditos.service";

@Component({
  selector: "app-dashboard-page",
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container animate-fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">Dashboard Financiero</h1>
          <p class="page-subtitle">
            Monitoreo en tiempo real de colocación y estado de créditos
          </p>
        </div>
        <div>
          <a routerLink="/creditos/nuevo" class="btn btn-primary">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Radicar Crédito</span>
          </a>
        </div>
      </div>

      <!-- Alerta de Error -->
      @if (errorMessage()) {
        <div class="alert alert-error">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <div>
            <strong>Error de conexión:</strong> {{ errorMessage() }}
            <button
              (click)="loadStats()"
              class="btn btn-sm btn-outline"
              style="margin-left: 10px;"
            >
              Reintentar
            </button>
          </div>
        </div>
      }

      <!-- Indicador de Carga -->
      @if (loading()) {
        <div
          class="card"
          style="padding: 40px; text-align: center; color: var(--color-text-muted);"
        >
          Cargando indicadores financieros...
        </div>
      } @else if (stats()) {
        <!-- Grid de Tarjetas KPI -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-header">
              <span class="kpi-title">Total Solicitudes</span>
              <div class="kpi-icon icon-blue">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                  ></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
              </div>
            </div>
            <div class="kpi-value">{{ stats()!.totalCreditos }}</div>
            <div class="kpi-footer">Radicadas en la plataforma</div>
          </div>

          <div class="kpi-card accent-green">
            <div class="kpi-header">
              <span class="kpi-title">Cartera Total</span>
              <div class="kpi-icon icon-green">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path
                    d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
                  ></path>
                </svg>
              </div>
            </div>
            <div class="kpi-value">
              {{ formatCurrency(stats()!.montoTotalCartera) }}
            </div>
            <div class="kpi-footer">Volumen de créditos solicitados</div>
          </div>

          <div class="kpi-card accent-amber">
            <div class="kpi-header">
              <span class="kpi-title">En Gestión (Pendientes)</span>
              <div class="kpi-icon icon-amber">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
            </div>
            <div class="kpi-value">{{ countPending() }}</div>
            <div class="kpi-footer">
              {{ formatCurrency(amountPending()) }} en estudio
            </div>
          </div>

          <div class="kpi-card accent-emerald">
            <div class="kpi-header">
              <span class="kpi-title">Desembolsados</span>
              <div class="kpi-icon icon-emerald">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
            </div>
            <div class="kpi-value">
              {{ stats()!.porEstado["DESEMBOLSADO"].cantidad }}
            </div>
            <div class="kpi-footer">
              {{
                formatCurrency(stats()!.porEstado["DESEMBOLSADO"].monto)
              }}
              girados
            </div>
          </div>
        </div>

        <!-- Distribución y Desglose por Estado -->
        <div class="distribution-section">
          <div class="card">
            <div class="card-header">
              <h2>Distribución del Portafolio por Estado</h2>
              <a routerLink="/creditos" class="btn btn-outline btn-sm"
                >Ver Listado Detallado →</a
              >
            </div>
            <div class="card-body">
              <!-- Barra Proporcional de Estado -->
              <div class="progress-bar-container">
                @for (state of stateKeys; track state) {
                  @if (getPercent(state) > 0) {
                    <div
                      class="progress-segment segment-{{ state.toLowerCase() }}"
                      [style.width.%]="getPercent(state)"
                      [title]="
                        state + ': ' + getPercent(state).toFixed(1) + '%'
                      "
                    ></div>
                  }
                }
              </div>

              <!-- Grilla de Estados -->
              <div class="status-cards-grid">
                @for (state of stateKeys; track state) {
                  <div class="status-summary-item">
                    <div class="status-summary-top">
                      <span class="badge badge-{{ state.toLowerCase() }}">{{
                        state
                      }}</span>
                      <span class="status-summary-count">{{
                        stats()!.porEstado[state].cantidad
                      }}</span>
                    </div>
                    <div class="status-summary-amount">
                      {{ formatCurrency(stats()!.porEstado[state].monto) }}
                    </div>
                    <div class="status-summary-pct">
                      {{ getPercent(state).toFixed(1) }}% del volumen
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }

      .kpi-card {
        background: #ffffff;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        padding: 20px;
        box-shadow: var(--shadow-sm);
        position: relative;
        overflow: hidden;
      }

      .kpi-card::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: var(--color-primary);
      }

      .kpi-card.accent-green::before {
        background: #059669;
      }
      .kpi-card.accent-amber::before {
        background: #d97706;
      }
      .kpi-card.accent-emerald::before {
        background: #10b981;
      }

      .kpi-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }

      .kpi-title {
        font-size: 0.82rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--color-text-muted);
      }

      .kpi-icon {
        width: 38px;
        height: 38px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .icon-blue {
        background: #eff6ff;
        color: #2563eb;
      }
      .icon-green {
        background: #ecfdf5;
        color: #059669;
      }
      .icon-amber {
        background: #fffbeb;
        color: #d97706;
      }
      .icon-emerald {
        background: #f0fdf4;
        color: #10b981;
      }

      .kpi-value {
        font-size: 1.6rem;
        font-weight: 800;
        color: var(--color-text);
        letter-spacing: -0.02em;
        line-height: 1.2;
      }

      .kpi-footer {
        margin-top: 6px;
        font-size: 0.8rem;
        color: var(--color-text-muted);
      }

      .distribution-section {
        margin-top: 10px;
      }

      .progress-bar-container {
        height: 12px;
        display: flex;
        border-radius: 999px;
        overflow: hidden;
        background: #e2e8f0;
        margin-bottom: 24px;
      }

      .progress-segment {
        height: 100%;
        transition: width 0.3s ease;
      }

      .segment-solicitado {
        background-color: #3b82f6;
      }
      .segment-en_estudio {
        background-color: #f59e0b;
      }
      .segment-aprobado {
        background-color: #10b981;
      }
      .segment-desembolsado {
        background-color: #059669;
      }
      .segment-rechazado {
        background-color: #ef4444;
      }
      .segment-cancelado {
        background-color: #94a3b8;
      }

      .status-cards-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
        gap: 14px;
      }

      .status-summary-item {
        background: #f8fafc;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        padding: 14px;
        transition: transform 0.15s ease;
      }

      .status-summary-item:hover {
        transform: translateY(-2px);
      }

      .status-summary-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }

      .status-summary-count {
        font-weight: 700;
        font-size: 1.15rem;
        color: var(--color-text);
      }

      .status-summary-amount {
        font-weight: 600;
        font-size: 0.95rem;
        color: var(--color-primary);
      }

      .status-summary-pct {
        font-size: 0.75rem;
        color: var(--color-text-muted);
        margin-top: 4px;
      }
    `,
  ],
})
export class DashboardPage implements OnInit {
  private readonly creditosService = inject(CreditosService);

  readonly stats = signal<CreditoStats | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  readonly stateKeys: CreditoEstado[] = [
    "SOLICITADO",
    "EN_ESTUDIO",
    "APROBADO",
    "DESEMBOLSADO",
    "RECHAZADO",
    "CANCELADO",
  ];

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.creditosService.getStats().subscribe({
      next: (data) => {
        this.stats.set(data);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.errorMessage.set(
          err?.message || "No fue posible cargar las estadísticas.",
        );
        this.loading.set(false);
      },
    });
  }

  countPending(): number {
    const s = this.stats();
    if (!s) return 0;
    return (
      s.porEstado["SOLICITADO"].cantidad + s.porEstado["EN_ESTUDIO"].cantidad
    );
  }

  amountPending(): number {
    const s = this.stats();
    if (!s) return 0;
    return s.porEstado["SOLICITADO"].monto + s.porEstado["EN_ESTUDIO"].monto;
  }

  getPercent(state: CreditoEstado): number {
    const s = this.stats();
    if (!s || s.totalCreditos === 0) return 0;
    return (s.porEstado[state].cantidad / s.totalCreditos) * 100;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(value);
  }
}
