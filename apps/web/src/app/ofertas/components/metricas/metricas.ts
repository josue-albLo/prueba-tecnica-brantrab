import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CurrencyPipe, DecimalPipe, PercentPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import Chart from 'chart.js/auto';

import { Api } from '../../services/api';
import {
  ETIQUETAS_OFERTA,
  MetricasEvaluacion,
} from '../../interfaces/ofertas.interface';

@Component({
  selector: 'app-metricas',
  imports: [CurrencyPipe, DecimalPipe, PercentPipe],
  templateUrl: './metricas.html',
  styleUrl: './metricas.scss',
})
export class Metricas implements AfterViewInit, OnDestroy {
  private readonly api = inject(Api);
  private readonly destroyRef = inject(DestroyRef);

  readonly metricas = signal<MetricasEvaluacion | null>(null);
  readonly cargando = signal(true);
  readonly error = signal('');

  private readonly canvasMix = viewChild<ElementRef<HTMLCanvasElement>>('canvasMix');
  private readonly canvasGrupos = viewChild<ElementRef<HTMLCanvasElement>>('canvasGrupos');

  private graficaMix?: Chart;
  private graficaGrupos?: Chart;

  readonly rangoEdad = computed(() => {
    const m = this.metricas();
    if (!m || m.aprobados === 0) return '—';
    return `${m.edad_minima_aprobados} – ${m.edad_maxima_aprobados} años`;
  });

  constructor() {
  
    effect(() => {
      const m = this.metricas();
      if (m) this.dibujarGraficas(m);
    });
  }

  ngAfterViewInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.graficaMix?.destroy();
    this.graficaGrupos?.destroy();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set('');

    this.api
      .obtenerMetricas()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({
        next: (res) => this.metricas.set(res),
        error: () =>
          this.error.set('No se pudieron cargar las métricas. Verifica la conexión con la API.'),
      });
  }

  private dibujarGraficas(m: MetricasEvaluacion): void {
    const mix = this.canvasMix()?.nativeElement;
    const grupos = this.canvasGrupos()?.nativeElement;
    if (!mix || !grupos) return;

    this.graficaMix?.destroy();
    this.graficaGrupos?.destroy();

    const COLORES: Record<string, string> = {
      combinado: '#16a34a',
      tarjeta: '#2563eb',
      credito: '#4f46e5',
      rechazo: '#dc2626',
      no_evaluable: '#94a3b8',
    };

    this.graficaMix = new Chart(mix, {
      type: 'doughnut',
      data: {
        labels: m.mix_ofertas.map((o) => ETIQUETAS_OFERTA[o.tipo]),
        datasets: [
          {
            data: m.mix_ofertas.map((o) => o.cantidad),
            backgroundColor: m.mix_ofertas.map((o) => COLORES[o.tipo]),
            borderWidth: 2,
            borderColor: '#ffffff',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true } },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const o = m.mix_ofertas[ctx.dataIndex];
                return ` ${o.cantidad} clientes (${o.porcentaje}%)`;
              },
            },
          },
        },
      },
    });

    this.graficaGrupos = new Chart(grupos, {
      type: 'bar',
      data: {
        labels: m.por_grupo.map((g) => g.grupo.slice(0,1).toUpperCase()+g.grupo.slice(1,)),
        datasets: [
          {
            label: 'Aprobados',
            data: m.por_grupo.map((g) => g.aprobados),
            backgroundColor: '#16a34a',
            borderRadius: 6,
          },
          {
            label: 'No aprobados',
            data: m.por_grupo.map((g) => g.total - g.aprobados),
            backgroundColor: '#e2e8f0',
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { stacked: true, grid: { display: false } },
          y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } },
        },
        plugins: {
          legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16 } },
        },
      },
    });
  }
}