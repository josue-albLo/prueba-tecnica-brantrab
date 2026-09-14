export type TipoOferta = 'tarjeta' | 'credito' | 'combinado' | 'rechazo' | 'no_evaluable';

export interface ResultadoOferta {
  id_cliente: number;
  oferta_final: TipoOferta;
  limite_tarjeta: number | null;
  monto_credito: number | null;
  motivo: string;
  detalle: DetalleFinanciero | null;
  recomendaciones: Recomendacion[];
}

export interface ParametrosPaginacion {
  limite: number;
  offset: number;
}

export interface RespuestaPaginada<T> {
  datos: T[];
  total: number;
  limite: number;
  offset: number;
}

export const ETIQUETAS_OFERTA: Record<TipoOferta, string> = {
  tarjeta: 'Tarjeta de Crédito',
  credito: 'Crédito',
  combinado: 'Tarjeta + Crédito',
  rechazo: 'Rechazado',
  no_evaluable: 'No Evaluable',
};

export const ORDEN_OFERTAS: readonly TipoOferta[] = [
  'combinado',
  'tarjeta',
  'credito',
  'rechazo',
  'no_evaluable',
];

export interface ConteoOferta {
  tipo: TipoOferta;
  etiqueta: string;
  cantidad: number;
}

export type Grupo = 'basico' | 'bueno' | 'excelente';

export interface DetalleFinanciero {
  ingreso_mensual: number;
  pago_mensual_deudas: number;
  ratio_deuda: number;
  capacidad_pago: number;
  indice_confiabilidad: number;
  dias_atraso: number;
  edad: number;
  grupo: Grupo | null;
}

export interface Recomendacion {
  titulo: string;
  descripcion: string;
  brecha?: string;
}
