import { Injectable } from '@nestjs/common';
import { GRUPOS, POLITICA } from './ofertas.config.js';
import type {
  ClienteEvaluable,
  ClientInput,
  DetalleFinanciero,
  OfferResult,
  Recomendacion,
  TipoOferta,
} from './interfaces/index.js';

type ResultadoValidacion =
  { ok: true; cliente: ClienteEvaluable } | { ok: false; motivo: string };


type ResultadoBase = Omit<OfferResult, 'detalle' | 'recomendaciones'>;

type GrupoConfigurado = (typeof GRUPOS)[number];

@Injectable()
export class OfertasService {
  evaluarCliente(cliente: ClientInput): OfferResult {
    const validacion = this.validar(cliente);

    if (!validacion.ok) {
      return {
        ...this.resultado(
          cliente.id_cliente,
          'no_evaluable',
          validacion.motivo,
        ),
        detalle: null,
        recomendaciones: [
          {
            titulo: 'Completar la información del cliente',
            descripcion:
              'No fue posible evaluar la solicitud por datos faltantes o inconsistentes.',
            brecha: validacion.motivo,
          },
        ],
      };
    }

    const c = validacion.cliente;
    const ratioDeuda = c.pago_mensual_deudas / c.ingreso_mensual;
    const grupo = this.resolverGrupo(c.indice_confiabilidad);

    const detalle: DetalleFinanciero = {
      ingreso_mensual: c.ingreso_mensual,
      pago_mensual_deudas: c.pago_mensual_deudas,
      ratio_deuda: Number(ratioDeuda.toFixed(4)),
      capacidad_pago: this.calcularCapacidad(c),
      indice_confiabilidad: c.indice_confiabilidad,
      dias_atraso: c.dias_atraso,
      edad: c.edad,
      grupo: grupo?.grupo ?? null,
    };

    const motivoRechazo = this.evaluarRechazo(c, ratioDeuda);
    if (motivoRechazo) {
      return {
        ...this.resultado(c.id_cliente, 'rechazo', motivoRechazo),
        detalle,
        recomendaciones: this.generarRecomendaciones(c, ratioDeuda),
      };
    }

  
    if (!grupo) {
      return {
        ...this.resultado(
          c.id_cliente,
          'rechazo',
          'El índice de confiabilidad no corresponde a ningún grupo definido.',
        ),
        detalle,
        recomendaciones: [
          {
            titulo: 'Caso fuera de política',
            descripcion:
              'El perfil no corresponde a ningún grupo de la política vigente. ' +
              'Requiere revisión manual por parte del área de riesgo.',
          },
        ],
      };
    }

    return {
      ...this.construirOferta(c, ratioDeuda, grupo),
      detalle,
      recomendaciones: [],
    };
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

  private resolverGrupo(indice: number): GrupoConfigurado | undefined {
    return GRUPOS.find((g) => indice >= g.min && indice <= g.max);
  }

  private construirOferta(
    c: ClienteEvaluable,
    ratioDeuda: number,
    grupo: GrupoConfigurado,
  ): ResultadoBase {
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
  ): ResultadoBase {
    return {
      id_cliente,
      oferta_final,
      limite_tarjeta: null,
      monto_credito: null,
      motivo,
    };
  }

  
  private generarRecomendaciones(
    c: ClienteEvaluable,
    ratioDeuda: number,
  ): Recomendacion[] {
    const recs: Recomendacion[] = [];
    const moneda = (v: number) => `Q${Math.ceil(v).toLocaleString('es-GT')}`;

    if (c.indice_confiabilidad < POLITICA.INDICE_MINIMO) {
      const faltan = POLITICA.INDICE_MINIMO - c.indice_confiabilidad;
      recs.push({
        titulo: 'Mejorar el índice de confiabilidad',
        descripcion:
          'El índice refleja el historial de cumplimiento. Mantener los pagos al día ' +
          'durante los próximos meses es la vía principal para elevarlo.',
        brecha: `Faltan ${faltan} puntos para alcanzar el mínimo de ${POLITICA.INDICE_MINIMO}.`,
      });
    }

    if (c.dias_atraso > POLITICA.DIAS_ATRASO_MAXIMO) {
      recs.push({
        titulo: 'Regularizar la mora',
        descripcion:
          'Registra un atraso superior al permitido. Ponerse al día y sostener ' +
          'un período sin incumplimientos habilita una nueva evaluación.',
        brecha: `${c.dias_atraso} días de atraso frente al máximo de ${POLITICA.DIAS_ATRASO_MAXIMO}.`,
      });
    }

    if (c.edad < POLITICA.EDAD_MINIMA || c.edad > POLITICA.EDAD_MAXIMA) {
      recs.push({
        titulo: 'Edad fuera del rango de la política',
        descripcion:
          c.edad < POLITICA.EDAD_MINIMA
            ? `Podrá ser evaluado al cumplir ${POLITICA.EDAD_MINIMA} años.`
            : 'La política vigente no contempla este rango. Puede consultar productos alternativos en sucursal.',
      });
    }

    if (c.ingreso_mensual < POLITICA.INGRESO_MINIMO) {
      const faltan = POLITICA.INGRESO_MINIMO - c.ingreso_mensual;
      recs.push({
        titulo: 'Ingreso por debajo del mínimo',
        descripcion:
          'Si percibe ingresos adicionales no declarados, documentarlos puede ' +
          'cambiar el resultado de la evaluación.',
        brecha: `Faltan ${moneda(faltan)} para el mínimo de ${moneda(POLITICA.INGRESO_MINIMO)}.`,
      });
    }

    if (ratioDeuda > POLITICA.RATIO_DEUDA_MAXIMO) {
   
      const pagoMaximo = c.ingreso_mensual * POLITICA.RATIO_DEUDA_MAXIMO;
      const exceso = c.pago_mensual_deudas - pagoMaximo;
      recs.push({
        titulo: 'Reducir el nivel de endeudamiento',
        descripcion:
          'Sus pagos mensuales de deuda superan el porcentaje permitido del ingreso. ' +
          'Cancelar o consolidar obligaciones mejora este indicador.',
        brecha: `Debe reducir ${moneda(exceso)} mensuales para bajar del ${POLITICA.RATIO_DEUDA_MAXIMO * 100}%.`,
      });
    }

    if (this.calcularCapacidad(c) <= 0) {
      const necesario =
        c.pago_mensual_deudas / POLITICA.FACTOR_CAPACIDAD - c.ingreso_mensual;
      recs.push({
        titulo: 'Sin capacidad de pago disponible',
        descripcion:
          'Tras cubrir sus deudas actuales no queda margen para un nuevo compromiso. ' +
          'Reducir deudas existentes o incrementar ingresos habilitaría una oferta.',
        brecha:
          necesario > 0
            ? `Con el nivel de deuda actual, requeriría al menos ${moneda(necesario)} adicionales de ingreso mensual.`
            : undefined,
      });
    }

    return recs;
  }
}
