import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { ResultadoOferta } from '../../interfaces/ofertas.interface';
import { Api } from '../../services/api';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { KeyValuePipe } from '@angular/common';

@Component({
  imports: [KeyValuePipe],
  selector: 'app-panel-ofertas',
  styleUrl: './panel-ofertas.scss',
  templateUrl: './panel-ofertas.html',
  
})
export class PanelOfertas {
  private readonly api = inject(Api);
  private readonly destroyRef = inject(DestroyRef);
  resultados = signal<ResultadoOferta[]>([]);
  readonly cargando = signal<boolean>(false);
  readonly clickedButton = signal<boolean>(false)

  readonly error = signal<string>('');

  readonly totalClientes = computed(() => this.resultados().length);

  readonly resumenPorOferta = computed<Record<string, number>>(() => {
    const conteo: Record<string, number> = {};
    for (const r of this.resultados()) {
      conteo[r.oferta_final] = (conteo[r.oferta_final] || 0) + 1;
    }
    return conteo;
  });

  readonly porcentajeAprobados = computed<string>(() => {
    const total = this.totalClientes();
    if (total === 0) return '0';
    const aprobados = this.resultados().filter(
      (r) =>
        r.oferta_final.toLowerCase() !== 'rechazo' &&
        r.oferta_final.toLowerCase() !== 'no evaluable',
    ).length;
    return ((aprobados / total) * 100).toFixed(1);
  });

  evaluarTodos() {
    this.error.set('');
    this.cargando.set(true);
    this.clickedButton.set(true);
    this.api
      .evaluarTodos()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.cargando.set(false);
        }),
      )
      .subscribe({
        next: (res) => {
          this.resultados.set(res);
        },
        error: () => {
          this.error.set('No se pudo concetar con la API. Verifica que exista conexión.');
        },
      });
  }
}
