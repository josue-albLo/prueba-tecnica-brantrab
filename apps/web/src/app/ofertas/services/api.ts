import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  MetricasEvaluacion,
  RespuestaPaginada,
  ResultadoOferta,
} from '../interfaces/ofertas.interface';
import { environment } from '../../../environments/environment.development';



@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  evaluarTodos(limite: number, offset: number): Observable<RespuestaPaginada<ResultadoOferta>> {
    const params = new HttpParams().set('limite', limite).set('offset', offset);

    return this.http.get<RespuestaPaginada<ResultadoOferta>>(`${this.apiUrl}/evaluar-todos`, {
      params,
    });
  }

  obtenerMetricas(): Observable<MetricasEvaluacion> {
    return this.http.get<MetricasEvaluacion>(`${this.apiUrl}/metricas`);
  }
}
