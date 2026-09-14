import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ResultadoOferta } from '../interfaces/ofertas.interface';

@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/ofertas';

  evaluarTodos(): Observable<ResultadoOferta[]> {
    return this.http.get<ResultadoOferta[]>(`${this.apiUrl}/evaluar-todos`);
  }
}
