import type { Cliente } from '@prisma/client';
import type { ClientInput } from './interfaces/index.js';

export function mapCliente(c: Cliente): ClientInput {
  const aNumero = (valor: unknown): number | null =>
    valor != null ? Number(valor) : null;

  return {
    id_cliente: c.id_cliente,
    edad: c.edad,
    ingreso_mensual: aNumero(c.ingreso_mensual),
    indice_confiabilidad: aNumero(c.indice_confiabilidad),
    dias_atraso: c.dias_atraso,
    pago_mensual_deudas: aNumero(c.pago_mensual_deudas),
    monto_solicitado: aNumero(c.monto_solicitado),
  };
}