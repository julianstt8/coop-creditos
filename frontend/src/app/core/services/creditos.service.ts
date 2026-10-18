import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { ApiSuccess } from '../models/api-response.model';
import type {
  ChangeEstadoDto,
  CreateCreditoDto,
  Credito,
  CreditoConDetalle,
  CreditosQueryParams,
  CreditoStats,
} from '../models/credito.model';

@Injectable({
  providedIn: 'root',
})
export class CreditosService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/creditos`;

  /**
   * Obtiene estadísticas agregadas de créditos para el Dashboard.
   */
  getStats(): Observable<CreditoStats> {
    return this.http
      .get<ApiSuccess<CreditoStats>>(`${this.baseUrl}/stats`)
      .pipe(map((res) => res.data));
  }

  /**
   * Lista créditos aplicando paginación y filtros.
   */
  findAll(query: CreditosQueryParams): Observable<ApiSuccess<Credito[]>> {
    let params = new HttpParams();

    if (query.page) params = params.set('page', query.page.toString());
    if (query.pageSize) params = params.set('pageSize', query.pageSize.toString());
    if (query.estado) params = params.set('estado', query.estado);
    if (query.identificacion) params = params.set('identificacion', query.identificacion);
    if (query.q) params = params.set('q', query.q);
    if (query.sortBy) params = params.set('sortBy', query.sortBy);
    if (query.sortOrder) params = params.set('sortOrder', query.sortOrder);

    return this.http.get<ApiSuccess<Credito[]>>(this.baseUrl, { params });
  }

  /**
   * Obtiene el detalle de un crédito con su historial y traza de webhook.
   */
  findById(id: number | string): Observable<CreditoConDetalle> {
    return this.http
      .get<ApiSuccess<CreditoConDetalle>>(`${this.baseUrl}/${id}`)
      .pipe(map((res) => res.data));
  }

  /**
   * Radica una nueva solicitud de crédito.
   */
  create(data: CreateCreditoDto): Observable<Credito> {
    return this.http
      .post<ApiSuccess<Credito>>(this.baseUrl, data)
      .pipe(map((res) => res.data));
  }

  /**
   * Ejecuta una transición de estado con registro de auditoría.
   */
  changeEstado(id: number | string, data: ChangeEstadoDto): Observable<Credito> {
    return this.http
      .patch<ApiSuccess<Credito>>(`${this.baseUrl}/${id}/estado`, data)
      .pipe(map((res) => res.data));
  }

  /**
   * Realiza el borrado lógico de un crédito.
   */
  delete(id: number | string): Observable<void> {
    return this.http
      .delete<ApiSuccess<{ deleted: boolean }>>(`${this.baseUrl}/${id}`)
      .pipe(map(() => void 0));
  }
}
