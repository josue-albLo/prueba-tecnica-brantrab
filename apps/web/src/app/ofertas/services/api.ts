import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  RespuestaPaginada,
  ResultadoOferta,
} from '../interfaces/ofertas.interface';

@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/ofertas';

  evaluarTodos(
    limite: number,
    offset: number,
  ): Observable<RespuestaPaginada<ResultadoOferta>> {
    const params = new HttpParams().set('limite', limite).set('offset', offset);

    return this.http.get<RespuestaPaginada<ResultadoOferta>>(
      `${this.apiUrl}/evaluar-todos`,
      { params },
    );
  }
}