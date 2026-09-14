import { Injectable } from '@nestjs/common';
import { ClientInput, OfferResult } from './interfaces/index.js';

export interface Validations {
  esValidaEdad: () => boolean;
  esValidoIngresoMensual: () => boolean;
  esValidoIndiceConfiabilidad: () => boolean;
  esValidoDiasAtraso: () => boolean;
  esValidoPagoMensualDeudas: () => boolean;
}

class ValitationClient implements Validations {
  constructor(private client: ClientInput) {}

  esValidaEdad() {
    return (
      this.client.edad != null &&
      this.client.edad >= 18 &&
      this.client.edad <= 100
    );
  }

  esValidoIngresoMensual() {
    return (
      this.client.ingreso_mensual != null && this.client.ingreso_mensual >= 0
    );
  }
  esValidoIndiceConfiabilidad() {
    return (
      this.client.indice_confiabilidad != null &&
      this.client.indice_confiabilidad >= 0 &&
      this.client.indice_confiabilidad <= 1000
    );
  }
  esValidoDiasAtraso() {
    return this.client.dias_atraso != null;
  }
  esValidoPagoMensualDeudas() {
    return (
      this.client.pago_mensual_deudas != null &&
      this.client.pago_mensual_deudas >= 0
    );
  }
}

export type Grupo = 'basico' | 'bueno' | 'excelente';

export type ClasificacionGrupo = Record<
  Grupo,
  {
    idx_confiabilidad_min: number;
    idx_confiabilidad_max: number;
  }
>;

@Injectable()
export class OfertasService {
  private readonly MINIMO_indice_confiabilidad = 500;
  private readonly DIAS_ATRASO_MAXIMO = 60;
  private readonly EDAD_MINIMA = 21;
  private readonly EDAD_MAXIMA = 70;
  private readonly INGRESO_MENSUAL_MINIMO = 3000;
  private readonly PORCENTAJE_MAXIMO_DEUDA = 0.45;

  private readonly RANGOS_IDX_CONFIDENCIALIDAD: ClasificacionGrupo = {
    basico: {
      idx_confiabilidad_min: 500,
      idx_confiabilidad_max: 649,
    },
    bueno: {
      idx_confiabilidad_min: 650,
      idx_confiabilidad_max: 799,
    },
    excelente: {
      idx_confiabilidad_min: 800,
      idx_confiabilidad_max: 1000,
    },
  };

  evaluarCliente(cliente: ClientInput): OfferResult {
    const validacion = this.validarDatos(cliente);

    if (validacion) return validacion;

    const porcentajeDeuda = this.calcularPorcentajeDeuda(cliente);
    const motivoRechazo = this.evaluarRechazo(cliente, porcentajeDeuda);

    if (motivoRechazo) {
      return {
        id_cliente: cliente.id_cliente,
        oferta_final: 'rechazo',
        limite_tarjeta: null,
        monto_credito: null,
        motivo: motivoRechazo,
      };
    }

    if (!porcentajeDeuda) {
      return {
        id_cliente: cliente.id_cliente,
        oferta_final: 'rechazo',
        limite_tarjeta: null,
        monto_credito: null,
        motivo:
          'No se pudo calcular el porcentaje de deuda. Por valores invalidos en Pago Mensual de Deudas o Ingreso Mensual',
      };
    }

    return this.calcularOferta(cliente, porcentajeDeuda);
  }

  private validarDatos(cliente: ClientInput): null | OfferResult {
    const clientValidation = new ValitationClient(cliente);
    if (!clientValidation.esValidaEdad())
      return this.noEvaluable(cliente.id_cliente, 'Edad inválida');

    if (!clientValidation.esValidoIngresoMensual())
      return this.noEvaluable(cliente.id_cliente, 'Ingreso mensual inválido');

    if (!clientValidation.esValidoIndiceConfiabilidad())
      return this.noEvaluable(
        cliente.id_cliente,
        'índice de confiabilidad inválido',
      );

    if (!clientValidation.esValidoDiasAtraso())
      return this.noEvaluable(cliente.id_cliente, 'Dias de atraso inválidos');

    if (!clientValidation.esValidoPagoMensualDeudas())
      return this.noEvaluable(
        cliente.id_cliente,
        'Pgo mensual de deudas inválido',
      );

    return null;
  }

  private noEvaluable(id: number, motivo: string): OfferResult {
    return {
      id_cliente: id,
      oferta_final: 'no_evaluable',
      limite_tarjeta: null,
      monto_credito: null,
      motivo,
    };
  }

  private calcularPorcentajeDeuda(client: ClientInput) {
    const { pago_mensual_deudas, ingreso_mensual } = client;
    if (!pago_mensual_deudas || !ingreso_mensual) return null;
    return pago_mensual_deudas / ingreso_mensual;
  }

  private evaluarRechazo(client: ClientInput, porcentajeDeuda: number | null) {
    const { indice_confiabilidad, dias_atraso, edad, ingreso_mensual } = client;

    if (
      indice_confiabilidad &&
      indice_confiabilidad < this.MINIMO_indice_confiabilidad
    )
      return `Índice de confiabilidid menor a ${this.MINIMO_indice_confiabilidad}.`;
    if (dias_atraso && dias_atraso > this.DIAS_ATRASO_MAXIMO)
      return `Días de atraso mayor a${this.DIAS_ATRASO_MAXIMO}.`;
    if (edad && edad < this.EDAD_MINIMA && edad > this.EDAD_MAXIMA)
      return 'Edad fuera del rango permitido';
    if (ingreso_mensual && ingreso_mensual < this.INGRESO_MENSUAL_MINIMO)
      return `Ingreso menor a Q${this.INGRESO_MENSUAL_MINIMO}`;
    if (porcentajeDeuda && porcentajeDeuda > this.PORCENTAJE_MAXIMO_DEUDA)
      return `Porcentaje de deuda mayor a ${this.PORCENTAJE_MAXIMO_DEUDA * 100}%`;

    return null;
  }

  private calcularOferta(
    cliente: ClientInput,
    porcentajeDeuda: number,
  ): OfferResult {
    const capacidad = Math.max(
      0,
      cliente.ingreso_mensual! * 0.4 - cliente.pago_mensual_deudas!,
    );
    const redondearCentena = (valor: number) => Math.round(valor / 100) * 100;
    const idx = cliente.indice_confiabilidad;

    // Clasificación de de Grupo Básico
    if (
      idx &&
      idx >= this.RANGOS_IDX_CONFIDENCIALIDAD.basico.idx_confiabilidad_min &&
      idx <= this.RANGOS_IDX_CONFIDENCIALIDAD.basico.idx_confiabilidad_max
    ) {
      const limite = Math.min(capacidad * 3);
      return {
        id_cliente: cliente.id_cliente,
        oferta_final: 'tarjeta',
        limite_tarjeta: redondearCentena(limite),
        monto_credito: null,
        motivo: 'Grupo básico',
      };
    }

    // Clasificación de Grupo Bueno - Beneficio de tarjeta por mantenerse en los rangos minimos del Índice de Confiabilidad
    if (
      idx &&
      idx >= this.RANGOS_IDX_CONFIDENCIALIDAD.bueno.idx_confiabilidad_max &&
      idx <= this.RANGOS_IDX_CONFIDENCIALIDAD.bueno.idx_confiabilidad_max
    ) {
      // Clasificación de Grupo Bueno - Beneficio de producto combinado (tarjeta + credito) si tiene una deuda menor o igual a 30%
      if (porcentajeDeuda <= 0.3) {
        return {
          id_cliente: cliente.id_cliente,
          oferta_final: 'combinado',
          limite_tarjeta: redondearCentena(Math.min(capacidad * 3, 40000)),
          monto_credito: redondearCentena(Math.min(capacidad * 24, 150000)),
          motivo: 'Grupo bueno, deuda menor o igual a 30%',
        };
      }

      // Clasificación de Grupo Bueno - Beneficio tarjeta con una deuda mayor al 30%
      return {
        id_cliente: cliente.id_cliente,
        oferta_final: 'tarjeta',
        limite_tarjeta: redondearCentena(Math.min(capacidad * 4, 40000)),
        monto_credito: null,
        motivo: 'Grupo bueno, deuda mayor al 30%',
      };
    }

    // Clasificación de Grupo Excelente - Beneficio de producto combinado (tarjeta + credito)
    if (porcentajeDeuda <= 0.3) {
      return {
        id_cliente: cliente.id_cliente,
        oferta_final: 'combinado',
        limite_tarjeta: redondearCentena(Math.min(capacidad * 4, 80000)),
        monto_credito: redondearCentena(Math.min(capacidad * 36, 250000)),
        motivo: 'Grupo excelente, deuda menor o igual a 30%',
      };
    }

    // Clasificación de Grupo Excelente  - Beneficio de tarjeta con deuda mayor al 30%
    return {
      id_cliente: cliente.id_cliente,
      oferta_final: 'credito',
      limite_tarjeta: null,
      monto_credito: redondearCentena(Math.min(capacidad * 36, 250000)),
      motivo: 'Grupo excelente, deuda mayor 30%',
    };
  }
}
