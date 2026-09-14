import { CurrencyPipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import {
  ConteoOferta,
  ETIQUETAS_OFERTA,
  ORDEN_OFERTAS,
  ResultadoOferta,
  TipoOferta,
} from '../../interfaces/ofertas.interface';
import { Api } from '../../services/api';
import { DetalleOferta } from '../detalle-oferta/detalle-oferta';

const OFERTAS_NO_APROBADAS: ReadonlySet<TipoOferta> = new Set(['rechazo', 'no_evaluable']);
const TAMANIOS_PAGINA = [25, 50, 100, 200, 300, 600] as const;

@Component({
  imports: [CurrencyPipe, DetalleOferta],
  selector: 'app-panel-ofertas',
  styleUrl: './panel-ofertas.scss',
  templateUrl: './panel-ofertas.html',
})
export class PanelOfertas {
  private readonly api = inject(Api);
  private readonly destroyRef = inject(DestroyRef);
  readonly detalleSeleccionado = signal<ResultadoOferta | null>(null);

  readonly tamaniosPagina = TAMANIOS_PAGINA;

  readonly resultados = signal<ResultadoOferta[]>([]);
  readonly cargando = signal(false);
  readonly consultaRealizada = signal(false);
  readonly error = signal('');

  readonly limite = signal(50);
  readonly offset = signal(0);

  readonly paginaActual = computed(() => Math.floor(this.offset() / this.limite()) + 1);

  readonly totalEnPagina = computed(() => this.resultados().length);

  readonly total = signal(0);

  readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.total() / this.limite())));

  readonly hayPaginaSiguiente = computed(() => this.offset() + this.limite() < this.total());

  readonly hayPaginaAnterior = computed(() => this.offset() > 0);

  readonly resumenPorOferta = computed<ConteoOferta[]>(() => {
    const conteo = new Map<TipoOferta, number>();

    for (const r of this.resultados()) {
      conteo.set(r.oferta_final, (conteo.get(r.oferta_final) ?? 0) + 1);
    }

    return ORDEN_OFERTAS.filter((tipo) => conteo.has(tipo)).map((tipo) => ({
      tipo,
      etiqueta: ETIQUETAS_OFERTA[tipo],
      cantidad: conteo.get(tipo)!,
    }));
  });
  readonly porcentajeAprobados = computed(() => {
    const total = this.totalEnPagina();
    if (total === 0) return '0';

    const aprobados = this.resultados().filter(
      (r) => !OFERTAS_NO_APROBADAS.has(r.oferta_final),
    ).length;

    return ((aprobados / total) * 100).toFixed(1);
  });

  readonly tieneProductos = computed(() => {
    const r = this.detalleSeleccionado();
    return r !== null && r.oferta_final !== 'rechazo' && r.oferta_final !== 'no_evaluable';
  });

  evaluar(): void {
    this.consultaRealizada.set(true);
    this.cargar();
  }

  paginaSiguiente(): void {
    if (!this.hayPaginaSiguiente()) return;
    this.offset.update((v) => v + this.limite());
    this.cargar();
  }

  paginaAnterior(): void {
    if (!this.hayPaginaAnterior()) return;
    this.offset.update((v) => Math.max(0, v - this.limite()));
    this.cargar();
  }

  cambiarLimite(valor: string): void {
    this.limite.set(Number(valor));
    this.offset.set(0);
    if (this.consultaRealizada()) this.cargar();
  }

  private cargar(): void {
    this.error.set('');
    this.cargando.set(true);

    this.api
      .evaluarTodos(this.limite(), this.offset())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({
        next: (res) => {
          this.resultados.set(res.datos);
          this.total.set(res.total);
        },
        error: () => {
          this.resultados.set([]);
          this.total.set(0);
          this.error.set('No se pudo conectar con la API. Verifica que exista conexión.');
        },
      });
  }

  etiquetaOferta(tipo: TipoOferta): string {
    return ETIQUETAS_OFERTA[tipo];
  }

  verDetalle(resultado: ResultadoOferta): void {
    this.detalleSeleccionado.set(resultado);
  }

  cerrarDetalle(): void {
    this.detalleSeleccionado.set(null);
  }
  descargarCsv(): void {
  window.location.href = 'http://localhost:3000/ofertas/exportar';
}
}
