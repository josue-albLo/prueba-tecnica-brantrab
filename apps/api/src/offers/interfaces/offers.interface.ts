export interface ClientInput {
  id_cliente: number;
  edad: number | null;
  ingreso_mensual: number | null;
  indice_confiabilidad: number | null;
  dias_atraso: number | null;
  pago_mensual_deudas: number | null;
  monto_solicitado: number | null;
}

export interface OfferResult {
  id_cliente: number;
  oferta_final: string;
  limite_tarjeta: number | null;
  monto_credito: number | null;
  motivo: string;
}
