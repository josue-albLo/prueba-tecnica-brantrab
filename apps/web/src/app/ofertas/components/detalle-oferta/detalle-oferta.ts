import { Component, computed, HostListener, input, output } from '@angular/core';
import { ETIQUETAS_OFERTA, ResultadoOferta } from '../../interfaces/ofertas.interface';
import { CurrencyPipe, DecimalPipe, PercentPipe } from '@angular/common';

@Component({
  imports: [CurrencyPipe, DecimalPipe, PercentPipe],
  selector: 'app-detalle-oferta',
  styleUrl: './detalle-oferta.scss',
  templateUrl: './detalle-oferta.html',
})
export class DetalleOferta {
  readonly resultado = input.required<ResultadoOferta>();
  readonly cerrar = output<void>();

  readonly tieneProductos = computed(() => {
    const tipo = this.resultado().oferta_final;
    return tipo !== 'rechazo' && tipo !== 'no_evaluable';
  });

  readonly etiqueta = computed(() => ETIQUETAS_OFERTA[this.resultado().oferta_final]);

  readonly montoTotal = computed(() => {
    const r = this.resultado();
    return (r.limite_tarjeta ?? 0) + (r.monto_credito ?? 0);
  });

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.cerrar.emit();
  }
}
