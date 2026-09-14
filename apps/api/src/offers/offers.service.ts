import { Injectable } from '@nestjs/common';
import { GRUPOS, POLITICA } from './ofertas.config.js';
import type {
  ClienteEvaluable,
  ClientInput,
  OfferResult,
  TipoOferta,
} from './interfaces/index.js';

type ResultadoValidacion =
  | { ok: true; cliente: ClienteEvaluable }
  | { ok: false; motivo: string };

@Injectable()
export class OfertasService {
  evaluarCliente(cliente: ClientInput): OfferResult {
    const validacion = this.validar(cliente);
    if (!validacion.ok) {
      return this.resultado(
        cliente.id_cliente,
        'no_evaluable',
        validacion.motivo,
      );
    }

    const evaluable = validacion.cliente;
    const ratioDeuda = evaluable.pago_mensual_deudas / evaluable.ingreso_mensual;

    const motivoRechazo = this.evaluarRechazo(evaluable, ratioDeuda);
    if (motivoRechazo) {
      return this.resultado(evaluable.id_cliente, 'rechazo', motivoRechazo);
    }

    return this.construirOferta(evaluable, ratioDeuda);
  }

  
  private validar(c: ClientInput): ResultadoValidacion {
    if (
      c.edad == null ||
      c.edad < POLITICA.EDAD_MINIMA_EVALUABLE ||
      c.edad > POLITICA.EDAD_MAXIMA_EVALUABLE
    ) {
      return { ok: false, motivo: 'Edad inválida' };
    }

    
    if (c.ingreso_mensual == null || c.ingreso_mensual <= 0) {
      return { ok: false, motivo: 'Ingreso mensual inválido' };
    }

    if (
      c.indice_confiabilidad == null ||
      c.indice_confiabilidad < 0 ||
      c.indice_confiabilidad > 1000
    ) {
      return { ok: false, motivo: 'Índice de confiabilidad inválido' };
    }

    if (c.dias_atraso == null || c.dias_atraso < 0) {
      return { ok: false, motivo: 'Días de atraso inválidos' };
    }

    if (c.pago_mensual_deudas == null || c.pago_mensual_deudas < 0) {
      return { ok: false, motivo: 'Pago mensual de deudas inválido' };
    }

    return { ok: true, cliente: c as ClienteEvaluable };
  }

  
  private evaluarRechazo(
    c: ClienteEvaluable,
    ratioDeuda: number,
  ): string | null {
    if (c.indice_confiabilidad < POLITICA.INDICE_MINIMO) {
      return `Índice de confiabilidad menor a ${POLITICA.INDICE_MINIMO}.`;
    }

    if (c.dias_atraso > POLITICA.DIAS_ATRASO_MAXIMO) {
      return `Días de atraso mayor a ${POLITICA.DIAS_ATRASO_MAXIMO}.`;
    }

    if (c.edad < POLITICA.EDAD_MINIMA || c.edad > POLITICA.EDAD_MAXIMA) {
      return `Edad fuera del rango permitido (${POLITICA.EDAD_MINIMA}-${POLITICA.EDAD_MAXIMA}).`;
    }

    if (c.ingreso_mensual < POLITICA.INGRESO_MINIMO) {
      return `Ingreso menor a Q${POLITICA.INGRESO_MINIMO}.`;
    }

    if (ratioDeuda > POLITICA.RATIO_DEUDA_MAXIMO) {
      return `Porcentaje de deuda mayor a ${POLITICA.RATIO_DEUDA_MAXIMO * 100}%.`;
    }

    if (this.calcularCapacidad(c) <= 0) {
      return 'El cliente no cuenta con capacidad de pago disponible.';
    }

    return null;
  }

  private construirOferta(
    c: ClienteEvaluable,
    ratioDeuda: number,
  ): OfferResult {
    const grupo = GRUPOS.find(
      (g) => c.indice_confiabilidad >= g.min && c.indice_confiabilidad <= g.max,
    );

   
    if (!grupo) {
      return this.resultado(
        c.id_cliente,
        'rechazo',
        'El índice de confiabilidad no corresponde a ningún grupo definido.',
      );
    }

    const deudaBaja = ratioDeuda <= POLITICA.RATIO_DEUDA_BAJA;
    const params = deudaBaja ? grupo.deudaBaja : grupo.deudaAlta;
    const capacidad = this.calcularCapacidad(c);

    return {
      id_cliente: c.id_cliente,
      oferta_final: params.tipo,
      limite_tarjeta: params.tarjeta
        ? this.calcularMonto(
            capacidad,
            params.tarjeta.factor,
            params.tarjeta.tope,
          )
        : null,
      monto_credito: params.credito
        ? this.calcularMonto(
            capacidad,
            params.credito.factor,
            params.credito.tope,
          )
        : null,
      motivo: `Grupo ${grupo.grupo}, deuda ${
        deudaBaja ? 'menor o igual a' : 'mayor a'
      } ${POLITICA.RATIO_DEUDA_BAJA * 100}%.`,
    };
  }

  private calcularCapacidad(c: ClienteEvaluable): number {
    return Math.max(
      0,
      c.ingreso_mensual * POLITICA.FACTOR_CAPACIDAD - c.pago_mensual_deudas,
    );
  }

  private calcularMonto(
    capacidad: number,
    factor: number,
    tope: number,
  ): number {
    const monto = Math.min(capacidad * factor, tope);
    return Math.floor(monto / POLITICA.REDONDEO) * POLITICA.REDONDEO;
  }

  private resultado(
    id_cliente: number,
    oferta_final: TipoOferta,
    motivo: string,
  ): OfferResult {
    return {
      id_cliente,
      oferta_final,
      limite_tarjeta: null,
      monto_credito: null,
      motivo,
    };
  }
}