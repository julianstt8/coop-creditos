import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import type { FormaPago, TipoCredito } from '../../../core/models/credito.model';
import { CreditosService } from '../../../core/services/creditos.service';

@Component({
  selector: 'app-credito-create-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="container animate-fade-in" style="max-width: 1050px;">
      <div class="page-header">
        <div>
          <a routerLink="/creditos" class="back-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span>Volver al listado de solicitudes</span>
          </a>
          <h1 class="page-title" style="margin-top: 8px;">Radicar Solicitud de Crédito</h1>
          <p class="page-subtitle">Formulario de registro oficial para asociados del sector financiero solidario</p>
        </div>
      </div>

      <!-- Alertas de Error -->
      @if (errorMessage()) {
        <div class="alert alert-error">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <div>
            <strong>No fue posible radicar la solicitud:</strong>
            <p style="margin: 4px 0 0 0;">{{ errorMessage() }}</p>
          </div>
        </div>
      }

      <div class="create-grid">
        <!-- Formulario Principal -->
        <div class="form-container">
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="card">
            <div class="card-header">
              <h3>Datos del Asociado y Condiciones del Crédito</h3>
            </div>
            <div class="card-body">
              <!-- Información del Asociado -->
              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label" for="identificacion">Cédula de Ciudadanía / Documento *</label>
                  <input
                    id="identificacion"
                    type="text"
                    class="form-control"
                    formControlName="identificacionAsociado"
                    placeholder="Ej. 1001234567"
                  />
                  @if (form.controls.identificacionAsociado.touched && form.controls.identificacionAsociado.invalid) {
                    <div class="form-error">La cédula es requerida (mínimo 5 caracteres numéricos)</div>
                  }
                </div>

                <div class="form-group flex-2">
                  <label class="form-label" for="nombre">Nombre Completo del Asociado *</label>
                  <input
                    id="nombre"
                    type="text"
                    class="form-control"
                    formControlName="nombreAsociado"
                    placeholder="Ej. Juan Pérez Gómez"
                  />
                  @if (form.controls.nombreAsociado.touched && form.controls.nombreAsociado.invalid) {
                    <div class="form-error">El nombre es requerido (mínimo 3 caracteres)</div>
                  }
                </div>
              </div>

              <!-- Tipo de Crédito y Forma de Pago -->
              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label" for="tipoCredito">Línea de Crédito *</label>
                  <select id="tipoCredito" class="form-select" formControlName="tipoCredito">
                    <option value="LIBRE_INVERSION">Libre Inversión</option>
                    <option value="VIVIENDA">Vivienda</option>
                    <option value="EDUCATIVO">Educativo</option>
                    <option value="VEHICULO">Vehículo</option>
                    <option value="CALAMIDAD">Calamidad Doméstica</option>
                    <option value="COMERCIAL">Comercial Solidario</option>
                  </select>
                </div>

                <div class="form-group flex-1">
                  <label class="form-label" for="formaPago">Modalidad de Pago *</label>
                  <select id="formaPago" class="form-select" formControlName="formaPago">
                    <option value="NOMINA">Descuento por Nómina</option>
                    <option value="DEBITO_AUTOMATICO">Débito Automático a Cuenta</option>
                    <option value="VENTANILLA">Pago en Taquilla / Ventanilla</option>
                  </select>
                </div>
              </div>

              <!-- Condiciones Financieras -->
              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label" for="valorSolicitado">Monto Solicitado (Pesos Colombianos - COP) *</label>
                  <input
                    id="valorSolicitado"
                    type="number"
                    step="50000"
                    min="1"
                    class="form-control font-mono"
                    formControlName="valorSolicitado"
                    placeholder="Ej. 15000000"
                  />
                  @if (form.controls.valorSolicitado.touched && form.controls.valorSolicitado.invalid) {
                    <div class="form-error">Ingrese un monto mayor a cero</div>
                  }
                </div>

                <div class="form-group flex-1">
                  <label class="form-label" for="tasaInteres">Tasa de Interés Mensual (% Mes Vencido) *</label>
                  <input
                    id="tasaInteres"
                    type="number"
                    step="0.05"
                    min="0"
                    class="form-control font-mono"
                    formControlName="tasaInteres"
                    placeholder="Ej. 1.45"
                  />
                  @if (form.controls.tasaInteres.touched && form.controls.tasaInteres.invalid) {
                    <div class="form-error">La tasa de interés no puede ser negativa</div>
                  }
                </div>

                <div class="form-group flex-1">
                  <label class="form-label" for="numeroCuotas">Plazo en Cuotas Mensuales *</label>
                  <input
                    id="numeroCuotas"
                    type="number"
                    step="1"
                    min="1"
                    class="form-control font-mono"
                    formControlName="numeroCuotas"
                    placeholder="Ej. 36"
                  />
                  @if (form.controls.numeroCuotas.touched && form.controls.numeroCuotas.invalid) {
                    <div class="form-error">El plazo mínimo es de 1 cuota</div>
                  }
                </div>
              </div>

              <!-- Botones de Acción -->
              <div class="form-actions">
                <a routerLink="/creditos" class="btn btn-outline">Cancelar</a>
                <button type="submit" class="btn btn-primary" [disabled]="submitting() || form.invalid">
                  @if (submitting()) {
                    <span>Radicando solicitud...</span>
                  } @else {
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>Radicar Crédito</span>
                  }
                </button>
              </div>
            </div>
          </form>
        </div>

        <!-- Panel Lateral: Simulador de Cuota en Vivo -->
        <div class="simulator-container">
          <div class="card simulator-card">
            <div class="card-header simulator-header">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="4" y="2" width="16" height="20" rx="2"></rect>
                <line x1="8" y1="6" x2="16" y2="6"></line>
                <line x1="16" y1="14" x2="16" y2="18"></line>
                <path d="M16 10h.01"></path>
                <path d="M12 10h.01"></path>
                <path d="M8 10h.01"></path>
                <path d="M12 14h.01"></path>
                <path d="M8 14h.01"></path>
                <path d="M12 18h.01"></path>
                <path d="M8 18h.01"></path>
              </svg>
              <h3>Simulación de la Cuota</h3>
            </div>
            <div class="card-body">
              <div class="sim-item">
                <span class="sim-label">Cuota Mensual Estimada</span>
                <span class="sim-value-highlight">{{ formatCurrency(calculatedMonthlyPayment()) }}</span>
              </div>

              <div class="sim-divider"></div>

              <div class="sim-row">
                <span class="sim-sublabel">Capital solicitado:</span>
                <span class="sim-subvalue font-mono">{{ formatCurrency(form.value.valorSolicitado || 0) }}</span>
              </div>

              <div class="sim-row">
                <span class="sim-sublabel">Intereses proyectados:</span>
                <span class="sim-subvalue font-mono">{{ formatCurrency(calculatedTotalInterest()) }}</span>
              </div>

              <div class="sim-row">
                <span class="sim-sublabel">Total a pagar estimado:</span>
                <span class="sim-subvalue font-mono" style="font-weight: 700; color: var(--color-text);">
                  {{ formatCurrency(calculatedTotalPayment()) }}
                </span>
              </div>

              <div class="sim-notice">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <span>Cálculo de referencia bajo amortización de cuota fija. No incluye pólizas de seguro ni cobros administrativos adicionales.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
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
      .back-link:hover {
        color: var(--color-primary);
      }

      .create-grid {
        display: grid;
        grid-template-columns: 1fr 340px;
        gap: 24px;
        align-items: start;
      }

      @media (max-width: 900px) {
        .create-grid {
          grid-template-columns: 1fr;
        }
      }

      .form-row {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        margin-bottom: 8px;
      }

      .flex-1 { flex: 1 1 200px; }
      .flex-2 { flex: 2 1 300px; }

      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 24px;
        padding-top: 16px;
        border-top: 1px solid var(--color-border);
      }

      .simulator-card {
        border-top: 4px solid var(--color-primary);
        background: #fdfefe;
      }

      .simulator-header {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--color-primary);
      }

      .sim-item {
        text-align: center;
        padding: 12px 0;
      }

      .sim-label {
        display: block;
        font-size: 0.82rem;
        font-weight: 600;
        color: var(--color-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        margin-bottom: 6px;
      }

      .sim-value-highlight {
        font-size: 1.8rem;
        font-weight: 800;
        color: var(--color-primary);
        font-family: var(--font-mono);
        letter-spacing: -0.02em;
      }

      .sim-divider {
        height: 1px;
        background: var(--color-border);
        margin: 14px 0;
      }

      .sim-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
        font-size: 0.85rem;
      }

      .sim-sublabel {
        color: var(--color-text-secondary);
      }

      .sim-subvalue {
        font-weight: 600;
      }

      .sim-notice {
        margin-top: 16px;
        padding: 10px 12px;
        background: #f1f5f9;
        border-radius: var(--radius-sm);
        display: flex;
        align-items: flex-start;
        gap: 8px;
        font-size: 0.74rem;
        color: var(--color-text-muted);
        line-height: 1.4;
      }
    `,
  ],
})
export class CreditoCreatePage {
  private readonly fb = inject(FormBuilder);
  private readonly creditosService = inject(CreditosService);
  private readonly router = inject(Router);

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    identificacionAsociado: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(20)]],
    nombreAsociado: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
    tipoCredito: ['LIBRE_INVERSION' as TipoCredito, [Validators.required]],
    formaPago: ['NOMINA' as FormaPago, [Validators.required]],
    valorSolicitado: [15000000, [Validators.required, Validators.min(1)]],
    tasaInteres: [1.45, [Validators.required, Validators.min(0)]],
    numeroCuotas: [36, [Validators.required, Validators.min(1)]],
  });

  calculatedMonthlyPayment(): number {
    const p = this.form.value.valorSolicitado || 0;
    const rPercent = this.form.value.tasaInteres || 0;
    const n = this.form.value.numeroCuotas || 1;

    if (p <= 0 || n <= 0) return 0;
    if (rPercent === 0) return p / n;

    const r = rPercent / 100;
    const payment = (p * r) / (1 - Math.pow(1 + r, -n));
    return isFinite(payment) ? payment : 0;
  }

  calculatedTotalPayment(): number {
    const monthly = this.calculatedMonthlyPayment();
    const n = this.form.value.numeroCuotas || 1;
    return monthly * n;
  }

  calculatedTotalInterest(): number {
    const total = this.calculatedTotalPayment();
    const p = this.form.value.valorSolicitado || 0;
    return Math.max(0, total - p);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    const values = this.form.getRawValue();

    this.creditosService.create(values).subscribe({
      next: (created) => {
        this.submitting.set(false);
        this.router.navigate(['/creditos', created.id]);
      },
      error: (err: any) => {
        this.submitting.set(false);
        this.errorMessage.set(
          err?.message || 'Ocurrió un error al intentar radicar la solicitud de crédito.',
        );
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
}
