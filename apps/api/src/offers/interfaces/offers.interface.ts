
export interface ClientInput {
  id_cliente: number;
  edad: number | null;
  ingreso_mensual: number | null;
  indice_confiabilidad: number | null;
  dias_atraso: number | null;
  pago_mensual_deudas: number | null;
  monto_solicitado: number | null;
}


export interface ClienteEvaluable extends ClientInput {
  edad: number;
  ingreso_mensual: number;
  indice_confiabilidad: number;
  dias_atraso: number;
  pago_mensual_deudas: number;
}

export type TipoOferta =
  | 'tarjeta'
  | 'credito'
  | 'combinado'
  | 'rechazo'
  | 'no_evaluable';

export type Grupo = 'basico' | 'bueno' | 'excelente';

export interface OfferResult {
  id_cliente: number;
  oferta_final: TipoOferta;
  limite_tarjeta: number | null;
  monto_credito: number | null;
  motivo: string;
}