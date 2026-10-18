import { CommonModule } from '@angular/common';
import { Component, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import type { CreditoConDetalle, CreditoEstado } from '../../../core/models/credito.model';
import { CreditosService } from '../../../core/services/creditos.service';

@Component({
  selector: 'app-credito-detail-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="container animate-fade-in" style="max-width: 1100px;">
      <!-- Encabezado y Navegación -->
      <div class="page-header">
        <div>
          <a routerLink="/creditos" class="back-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span>Volver a la lista de solicitudes</span>
          </a>
          @if (credito()) {
            <div style="display: flex; align-items: center; gap: 12px; margin-top: 8px;">
              <h1 class="page-title font-mono">{{ credito()!.numeroCredito }}</h1>
              <span class="badge badge-{{ credito()!.estado.toLowerCase() }}">
                {{ formatEstado(credito()!.estado) }}
              </span>
            </div>
            <p class="page-subtitle">Titular: {{ credito()!.nombreAsociado }} · Cédula {{ credito()!.identificacionAsociado }}</p>
          } @else {
            <h1 class="page-title">Detalle de la Solicitud</h1>
          }
        </div>

        <div class="header-actions">
          @if (credito()) {
            <button (click)="confirmDelete()" class="btn btn-outline btn-sm btn-delete" title="Eliminar registro">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              <span>Eliminar Solicitud</span>
            </button>
          }
        </div>
      </div>

      <!-- Alertas de Éxito / Error -->
      @if (successMessage()) {
        <div class="alert alert-success">{{ successMessage() }}</div>
      }
      @if (errorMessage()) {
        <div class="alert alert-error">{{ errorMessage() }}</div>
      }

      @if (loading()) {
        <div class="card" style="padding: 40px; text-align: center; color: var(--color-text-muted);">
          Cargando detalle del crédito y su historial de auditoría...
        </div>
      } @else if (credito()) {
        <div class="detail-layout">
          <!-- Columna Izquierda: Información Financiera + Historial -->
          <div class="main-column">
            <!-- Tarjeta de Condiciones Financieras -->
            <div class="card">
              <div class="card-header">
                <h3>Condiciones Financieras de la Solicitud</h3>
                <span class="font-mono text-muted" style="font-size: 0.82rem;">Registro No. #{{ credito()!.id }}</span>
              </div>
              <div class="card-body">
                <div class="financial-grid">
                  <div class="fin-item">
                    <span class="fin-label">Monto Solicitado</span>
                    <span class="fin-value highlight">{{ formatCurrency(credito()!.valorSolicitado) }}</span>
                  </div>
                  <div class="fin-item">
                    <span class="fin-label">Tasa de Interés</span>
                    <span class="fin-value font-mono">{{ credito()!.tasaInteres }}% Mensual Vencido</span>
                  </div>
                  <div class="fin-item">
                    <span class="fin-label">Plazo Aprobado / Solicitado</span>
                    <span class="fin-value">{{ credito()!.numeroCuotas }} cuotas mensuales</span>
                  </div>
                  <div class="fin-item">
                    <span class="fin-label">Modalidad de Pago</span>
                    <span class="fin-value">{{ formatFormaPago(credito()!.formaPago) }}</span>
                  </div>
                  <div class="fin-item">
                    <span class="fin-label">Línea de Crédito</span>
                    <span class="fin-value">{{ formatTipo(credito()!.tipoCredito) }}</span>
                  </div>
                  <div class="fin-item">
                    <span class="fin-label">Fecha de Radicación</span>
                    <span class="fin-value">{{ formatDateFull(credito()!.fechaSolicitud) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Línea de Tiempo de Auditoría (HistorialCredito) -->
            <div class="card" style="margin-top: 20px;">
              <div class="card-header">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  <h3>Historial de Cambios y Trazabilidad Oficial</h3>
                </div>
                <span class="audit-badge">Registro Inmutable</span>
              </div>
              <div class="card-body">
                @if (credito()!.historial.length === 0) {
                  <p style="color: var(--color-text-muted); font-size: 0.88rem;">No se registran cambios de estado aún.</p>
                } @else {
                  <div class="timeline">
                    @for (item of credito()!.historial; track item.id) {
                      <div class="timeline-item">
                        <div class="timeline-marker marker-{{ item.estadoNuevo.toLowerCase() }}"></div>
                        <div class="timeline-content">
                          <div class="timeline-header">
                            <div class="timeline-transition">
                              @if (item.estadoAnterior) {
                                <span class="badge badge-sm badge-{{ item.estadoAnterior.toLowerCase() }}">{{ formatEstado(item.estadoAnterior) }}</span>
                                <span class="arrow-sep">→</span>
                              }
                              <span class="badge badge-sm badge-{{ item.estadoNuevo.toLowerCase() }}">{{ formatEstado(item.estadoNuevo) }}</span>
                            </div>
                            <span class="timeline-date font-mono">{{ formatDateFull(item.fechaCambio) }}</span>
                          </div>
                          <div class="timeline-user">
                            <strong>Funcionario Responsable:</strong> {{ item.usuario }}
                          </div>
                          @if (item.observacion) {
                            <div class="timeline-obs">
                              "{{ item.observacion }}"
                            </div>
                          }
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>

            <!-- Trazabilidad de la Notificación Externa -->
            <div class="card" style="margin-top: 20px;">
              <div class="card-header">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                  </svg>
                  <h3>Notificación a Sistemas Externos</h3>
                </div>
              </div>
              <div class="card-body">
                @if (credito()!.webhookLogs.length === 0) {
                  <p style="color: var(--color-text-muted); font-size: 0.88rem;">
                    No se han registrado envíos de notificación para este crédito.
                  </p>
                } @else {
                  @for (log of credito()!.webhookLogs; track log.id) {
                    <div class="webhook-log-card">
                      <div class="webhook-log-header">
                        <span class="badge {{ log.exitoso ? 'badge-aprobado' : 'badge-rechazado' }}">
                          {{ log.exitoso ? '✓ Entregado exitosamente (Código ' + log.responseStatus + ')' : '✗ Falla en entrega (Código ' + (log.responseStatus || 'Sin respuesta') + ')' }}
                        </span>
                        <span class="font-mono" style="font-size: 0.75rem; color: var(--color-text-muted);">
                          {{ formatDateFull(log.fechaCreacion) }}
                        </span>
                      </div>
                      <div class="webhook-log-url font-mono">
                        Servicio destino: {{ log.url }}
                      </div>
                      @if (log.error) {
                        <div class="webhook-log-error">
                          <strong>Detalle de la falla:</strong> {{ log.error }}
                        </div>
                      }
                      <details class="webhook-payload-details">
                        <summary>Ver datos detallados de la notificación</summary>
                        <pre class="font-mono payload-code">{{ formatJson(log.requestPayload) }}</pre>
                      </details>
                    </div>
                  }
                }
              </div>
            </div>
          </div>

          <!-- Columna Derecha: Gestión de Estado (Máquina de Estados) -->
          <div class="side-column">
            <div class="card state-machine-card">
              <div class="card-header">
                <h3>Actualizar Estado de la Solicitud</h3>
              </div>
              <div class="card-body">
                <div class="current-state-box">
                  <span class="sublabel">Estado Actual</span>
                  <div style="margin-top: 4px;">
                    <span class="badge badge-{{ credito()!.estado.toLowerCase() }}" style="font-size: 0.95rem; padding: 6px 14px;">
                      {{ formatEstado(credito()!.estado) }}
                    </span>
                  </div>
                </div>

                @if (isTerminalState(credito()!.estado)) {
                  <div class="terminal-state-notice">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <div>
                      <strong>Estado Final:</strong>
                      <p style="margin: 4px 0 0 0;">
                        Esta solicitud se encuentra en un estado definitivo ({{ formatEstado(credito()!.estado) }}). Por política de riesgo y control interno, no se permiten cambios posteriores.
                      </p>
                    </div>
                  </div>
                } @else {
                  <form (ngSubmit)="submitStateChange()" style="margin-top: 16px;">
                    <div class="form-group">
                      <label class="form-label" for="nuevoEstado">Nuevo Estado Autorizado *</label>
                      <select id="nuevoEstado" class="form-select" [(ngModel)]="selectedNewEstado" name="nuevoEstado" required>
                        <option value="" disabled selected>Seleccione el siguiente estado...</option>
                        @for (next of getAllowedNextStates(credito()!.estado); track next) {
                          <option [value]="next">{{ formatEstado(next) }}</option>
                        }
                      </select>
                      <span class="form-helper">Solo se muestran las transiciones autorizadas para este momento del crédito.</span>
                    </div>

                    <div class="form-group">
                      <label class="form-label" for="usuario">Funcionario o Analista Responsable *</label>
                      <input
                        id="usuario"
                        type="text"
                        class="form-control"
                        [(ngModel)]="operatorUser"
                        name="usuario"
                        placeholder="Ej. analista.credito@opasolidaria.com"
                        required
                      />
                    </div>

                    <div class="form-group">
                      <label class="form-label" for="observacion">Motivo o Justificación del Cambio *</label>
                      <textarea
                        id="observacion"
                        class="form-control"
                        rows="3"
                        [(ngModel)]="stateObservation"
                        name="observacion"
                        placeholder="Escriba aquí la justificación de la decisión tomada..."
                        required
                      ></textarea>
                    </div>

                    <button
                      type="submit"
                      class="btn btn-primary"
                      style="width: 100%;"
                      [disabled]="updatingState() || !selectedNewEstado || !stateObservation.trim()"
                    >
                      @if (updatingState()) {
                        <span>Registrando cambio...</span>
                      } @else {
                        <span>Confirmar Cambio de Estado</span>
                      }
                    </button>
                  </form>
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
      .back-link {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--color-text-muted);
        text-decoration: none;
      }
      .back-link:hover { color: var(--color-primary); }

      .header-actions {
        display: flex;
        gap: 10px;
      }

      .detail-layout {
        display: grid;
        grid-template-columns: 1fr 340px;
        gap: 24px;
      }

      @media (max-width: 900px) {
        .detail-layout {
          grid-template-columns: 1fr;
        }
      }

      .financial-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
      }

      .fin-item {
        background: #f8fafc;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        padding: 12px 14px;
      }

      .fin-label {
        display: block;
        font-size: 0.78rem;
        font-weight: 600;
        text-transform: uppercase;
        color: var(--color-text-muted);
        margin-bottom: 4px;
      }

      .fin-value {
        font-size: 1.05rem;
        font-weight: 700;
        color: var(--color-text);
      }

      .fin-value.highlight {
        color: var(--color-primary);
        font-size: 1.25rem;
      }

      .audit-badge {
        font-size: 0.72rem;
        font-weight: 700;
        text-transform: uppercase;
        background: #e0f2fe;
        color: #0369a1;
        padding: 3px 10px;
        border-radius: var(--radius-full);
      }

      /* Línea de Tiempo */
      .timeline {
        position: relative;
        padding-left: 20px;
      }

      .timeline::before {
        content: '';
        position: absolute;
        top: 8px;
        bottom: 8px;
        left: 6px;
        width: 2px;
        background: #e2e8f0;
      }

      .timeline-item {
        position: relative;
        margin-bottom: 20px;
      }

      .timeline-item:last-child {
        margin-bottom: 0;
      }

      .timeline-marker {
        position: absolute;
        left: -18px;
        top: 4px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #94a3b8;
        border: 2px solid #ffffff;
        box-shadow: 0 0 0 2px #cbd5e1;
      }

      .marker-solicitado { background: #3b82f6; }
      .marker-en_estudio { background: #f59e0b; }
      .marker-aprobado { background: #10b981; }
      .marker-desembolsado { background: #059669; }
      .marker-rechazado { background: #ef4444; }
      .marker-cancelado { background: #94a3b8; }

      .timeline-content {
        background: #f8fafc;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        padding: 12px 14px;
      }

      .timeline-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
      }

      .timeline-transition {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .arrow-sep {
        color: var(--color-text-muted);
        font-size: 0.85rem;
      }

      .badge-sm {
        font-size: 0.72rem;
        padding: 2px 6px;
      }

      .timeline-date {
        font-size: 0.75rem;
        color: var(--color-text-muted);
      }

      .timeline-user {
        font-size: 0.82rem;
        color: var(--color-text-secondary);
      }

      .timeline-obs {
        margin-top: 6px;
        font-size: 0.82rem;
        font-style: italic;
        color: var(--color-text);
        background: #ffffff;
        padding: 6px 10px;
        border-radius: var(--radius-sm);
        border-left: 3px solid var(--color-primary);
      }

      /* Logs de Notificación */
      .webhook-log-card {
        background: #f8fafc;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        padding: 12px 14px;
        margin-bottom: 10px;
      }

      .webhook-log-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
      }

      .webhook-log-url {
        font-size: 0.8rem;
        color: var(--color-text-secondary);
        word-break: break-all;
      }

      .webhook-log-error {
        margin-top: 6px;
        font-size: 0.8rem;
        color: #b91c1c;
      }

      .webhook-payload-details {
        margin-top: 8px;
        font-size: 0.78rem;
      }

      .webhook-payload-details summary {
        cursor: pointer;
        color: var(--color-primary);
        font-weight: 600;
      }

      .payload-code {
        margin-top: 6px;
        padding: 8px;
        background: #1e293b;
        color: #f8fafc;
        border-radius: var(--radius-sm);
        font-size: 0.72rem;
        overflow-x: auto;
      }

      /* Máquina de Estados lateral */
      .current-state-box {
        background: #f1f5f9;
        border-radius: var(--radius-sm);
        padding: 12px;
        text-align: center;
      }

      .terminal-state-notice {
        margin-top: 14px;
        padding: 12px;
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #991b1b;
        border-radius: var(--radius-sm);
        display: flex;
        gap: 10px;
        font-size: 0.82rem;
      }
    `,
  ],
})
export class CreditoDetailPage implements OnInit {
  private readonly creditosService = inject(CreditosService);
  private readonly router = inject(Router);

  readonly id = input.required<string>();

  readonly credito = signal<CreditoConDetalle | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly updatingState = signal(false);

  selectedNewEstado: CreditoEstado | '' = '';
  operatorUser = 'analista.credito@opasolidaria.com';
  stateObservation = '';

  private readonly transitionsMap: Record<CreditoEstado, readonly CreditoEstado[]> = {
    SOLICITADO: ['EN_ESTUDIO', 'CANCELADO'],
    EN_ESTUDIO: ['APROBADO', 'RECHAZADO', 'CANCELADO'],
    APROBADO: ['DESEMBOLSADO', 'CANCELADO'],
    RECHAZADO: [],
    DESEMBOLSADO: [],
    CANCELADO: [],
  };

  ngOnInit(): void {
    this.loadCredito();
  }

  loadCredito(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.creditosService.findById(this.id()).subscribe({
      next: (data) => {
        this.credito.set(data);
        this.selectedNewEstado = '';
        this.stateObservation = '';
        this.loading.set(false);
      },
      error: (err: any) => {
        this.errorMessage.set(err?.message || 'Error al cargar el detalle de la solicitud.');
        this.loading.set(false);
      },
    });
  }

  getAllowedNextStates(current: CreditoEstado): readonly CreditoEstado[] {
    return this.transitionsMap[current] ?? [];
  }

  isTerminalState(current: CreditoEstado): boolean {
    return this.getAllowedNextStates(current).length === 0;
  }

  submitStateChange(): void {
    if (!this.selectedNewEstado || !this.stateObservation.trim()) return;

    this.updatingState.set(true);
    this.errorMessage.set(null);

    this.creditosService
      .changeEstado(this.id(), {
        estadoNuevo: this.selectedNewEstado as CreditoEstado,
        usuario: this.operatorUser.trim() || 'USUARIO_OPERATIVO',
        observacion: this.stateObservation.trim(),
      })
      .subscribe({
        next: () => {
          this.updatingState.set(false);
          this.successMessage.set(
            `El crédito ahora se encuentra en estado ${this.formatEstado(this.selectedNewEstado)}. Registro de auditoría guardado exitosamente.`,
          );
          setTimeout(() => this.successMessage.set(null), 4000);
          this.loadCredito();
        },
        error: (err: any) => {
          this.updatingState.set(false);
          this.errorMessage.set(err?.message || 'Error al cambiar de estado.');
        },
      });
  }

  confirmDelete(): void {
    const c = this.credito();
    if (!c) return;

    const confirmed = confirm(
      `¿Está seguro de eliminar del sistema la solicitud de crédito ${c.numeroCredito}?`,
    );
    if (!confirmed) return;

    this.creditosService.delete(c.id).subscribe({
      next: () => {
        alert(`La solicitud ${c.numeroCredito} ha sido eliminada.`);
        this.router.navigate(['/creditos']);
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

  formatDateFull(dateStr: string): string {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);
  }

  formatFormaPago(fp: string): string {
    const map: Record<string, string> = {
      NOMINA: 'Descuento de Nómina',
      DEBITO_AUTOMATICO: 'Débito Automático',
      VENTANILLA: 'Ventanilla / Taquilla',
    };
    return map[fp] || fp.replace(/_/g, ' ');
  }

  formatTipo(t: string): string {
    const map: Record<string, string> = {
      LIBRE_INVERSION: 'Libre Inversión',
      VIVIENDA: 'Vivienda',
      EDUCATIVO: 'Educativo',
      VEHICULO: 'Vehículo',
      CALAMIDAD: 'Calamidad Doméstica',
      COMERCIAL: 'Comercial Solidario',
    };
    return map[t] || t.replace(/_/g, ' ');
  }

  formatEstado(estado: string): string {
    const map: Record<string, string> = {
      SOLICITADO: 'Solicitado',
      EN_ESTUDIO: 'En Estudio',
      APROBADO: 'Aprobado',
      DESEMBOLSADO: 'Desembolsado',
      RECHAZADO: 'Rechazado',
      CANCELADO: 'Cancelado',
    };
    return map[estado] || estado.replace(/_/g, ' ');
  }

  formatJson(rawJson: string): string {
    try {
      return JSON.stringify(JSON.parse(rawJson), null, 2);
    } catch {
      return rawJson;
    }
  }
}
