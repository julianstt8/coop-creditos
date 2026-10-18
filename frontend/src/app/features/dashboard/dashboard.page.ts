import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink],
  template: `
    <h1>Dashboard</h1>
    <p>Aquí verás el total de créditos y la cantidad por estado.</p>
    <a routerLink="/creditos/nuevo">Registrar un crédito</a>
  `,
})
export class DashboardPage {}
