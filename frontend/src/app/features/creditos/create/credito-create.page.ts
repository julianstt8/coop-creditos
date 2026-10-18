import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-credito-create-page',
  imports: [RouterLink],
  template: `
    <a routerLink="/creditos">← Volver a créditos</a>
    <h1>Nuevo crédito</h1>
    <p>Aquí irá el formulario de solicitud con sus validaciones.</p>
  `,
})
export class CreditoCreatePage {}
