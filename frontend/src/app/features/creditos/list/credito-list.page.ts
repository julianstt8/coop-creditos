import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-credito-list-page',
  imports: [RouterLink],
  template: `
    <h1>Créditos</h1>
    <p>Aquí verás el listado con búsqueda, filtros y paginación.</p>
    <a routerLink="/creditos/nuevo">Registrar un crédito</a>
  `,
})
export class CreditoListPage {}
