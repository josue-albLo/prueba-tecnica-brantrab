export interface ResultadoOferta {
  id_cliente: number;
  oferta_final: string;
  limite_tarjeta: number | null;
  monto_credito: number | null;
  motivo: string;
}