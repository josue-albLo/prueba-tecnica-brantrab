import type { Grupo, TipoOferta } from './interfaces/index.js';

export const POLITICA = {
  EDAD_MINIMA_EVALUABLE: 18,
  EDAD_MAXIMA_EVALUABLE: 100,
  INDICE_MINIMO: 500,
  DIAS_ATRASO_MAXIMO: 60,
  EDAD_MINIMA: 21,
  EDAD_MAXIMA: 70,
  INGRESO_MINIMO: 3000,
  RATIO_DEUDA_MAXIMO: 0.45,
  RATIO_DEUDA_BAJA: 0.3,
  FACTOR_CAPACIDAD: 0.4,
  REDONDEO: 100,
} as const;

interface Producto {
  factor: number;
  tope: number;
}

interface ParametrosOferta {
  tipo: Extract<TipoOferta, 'tarjeta' | 'credito' | 'combinado'>;
  tarjeta?: Producto;
  credito?: Producto;
}

interface RangoGrupo {
  grupo: Grupo;
  min: number;
  max: number;
  deudaBaja: ParametrosOferta;
  deudaAlta: ParametrosOferta;
}

export const GRUPOS: readonly RangoGrupo[] = [
  {
    grupo: 'basico',
    min: 500,
    max: 649,
    deudaBaja: { tipo: 'tarjeta', tarjeta: { factor: 3, tope: 20_000 } },
    deudaAlta: { tipo: 'tarjeta', tarjeta: { factor: 3, tope: 20_000 } },
  },
  {
    grupo: 'bueno',
    min: 650,
    max: 799,
    deudaBaja: {
      tipo: 'combinado',
      tarjeta: { factor: 3, tope: 40_000 },
      credito: { factor: 24, tope: 150_000 },
    },
    deudaAlta: { tipo: 'tarjeta', tarjeta: { factor: 4, tope: 40_000 } },
  },
  {
    grupo: 'excelente',
    min: 800,
    max: 1000,
    deudaBaja: {
      tipo: 'combinado',
      tarjeta: { factor: 4, tope: 80_000 },
      credito: { factor: 36, tope: 250_000 },
    },
    deudaAlta: { tipo: 'credito', credito: { factor: 36, tope: 250_000 } },
  },
];