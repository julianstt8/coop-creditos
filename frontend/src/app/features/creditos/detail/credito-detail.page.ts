import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-credito-detail-page',
  imports: [RouterLink],
  template: `
    <a routerLink="/creditos">← Volver a créditos</a>
    <h1>Crédito {{ id() }}</h1>
    <p>Aquí verás la información del crédito y su historial de cambios.</p>
  `,
})
export class CreditoDetailPage {
  /** Bound from the :id route param (withComponentInputBinding). */
  readonly id = input.required<string>();
}
