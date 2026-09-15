import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { mapCliente } from './cliente.mapper.js';
import {
  ORDEN_OFERTAS,
  type Grupo,
  type MetricasEvaluacion,
  type OfferResult,
  type RespuestaPaginada,
  type TipoOferta,
} from './interfaces/index.js';
import { POLITICA } from './ofertas.config.js';
import { OfertasService } from './offers.service.js';

@Injectable()
export class EvaluacionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ofertasService: OfertasService,
  ) {}

  async evaluarTodos(
    limite = 100,
    offset = 0,
  ): Promise<RespuestaPaginada<OfferResult>> {
    const take = Math.min(Math.max(limite, 1), 1000);
    const skip = Math.max(offset, 0);
    const [clientes, total] = await this.prisma.$transaction([
      this.prisma.cliente.findMany({
        take,
        skip,
        orderBy: { id_cliente: 'asc' },
      }),
      this.prisma.cliente.count(),
    ]);

    return {
      datos: clientes.map((c) =>
        this.ofertasService.evaluarCliente(mapCliente(c)),
      ),
      total,
      limite,
      offset,
    };
  }

  async evaluarPorId(id: number): Promise<OfferResult> {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id_cliente: id },
    });

    if (!cliente) {
      throw new NotFoundException(`Cliente con id ${id} no encontrado`);
    }

    return this.ofertasService.evaluarCliente(mapCliente(cliente));
  }

  async exportarCsv(): Promise<string> {
    const clientes = await this.prisma.cliente.findMany({
      orderBy: { id_cliente: 'asc' },
    });

    const cabecera = [
      'id_cliente',
      'oferta_final',
      'limite_tarjeta',
      'monto_credito',
      'motivo',
    ];

    const escapar = (valor: unknown): string => {
      if (valor == null) return '';
      const texto = String(valor);
      return /[",\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
    };

    const filas = clientes.map((c) => {
      const r = this.ofertasService.evaluarCliente(mapCliente(c));
      return [
        r.id_cliente,
        r.oferta_final,
        r.limite_tarjeta ?? '',
        r.monto_credito ?? '',
        r.motivo,
      ]
        .map(escapar)
        .join(',');
    });

    return [cabecera.join(','), ...filas].join('\r\n');
  }
  async calcularMetricas(): Promise<MetricasEvaluacion> {
    const clientes = await this.prisma.cliente.findMany({
      orderBy: { id_cliente: 'asc' },
    });

    const conteoOfertas = new Map<TipoOferta, number>();
    const conteoMotivos = new Map<string, number>();
    const porGrupo = new Map<
      Grupo,
      {
        total: number;
        aprobados: number;
        ingresos: number;
        ratios: number;
        capacidades: number;
      }
    >();

    let aprobados = 0;
    let rechazados = 0;
    let noEvaluables = 0;
    let sumaIngresoAprobados = 0;
    let sumaEdadAprobados = 0;
    let sumaCapacidadAprobados = 0;
    let edadMinima = Infinity;
    let edadMaxima = -Infinity;
    let clientesBuenaCapacidad = 0;
    let limiteTarjetaTotal = 0;
    let montoCreditoTotal = 0;

    for (const cliente of clientes) {
      const r = this.ofertasService.evaluarCliente(mapCliente(cliente));

      conteoOfertas.set(
        r.oferta_final,
        (conteoOfertas.get(r.oferta_final) ?? 0) + 1,
      );

      const esAprobado =
        r.oferta_final !== 'rechazo' && r.oferta_final !== 'no_evaluable';

      if (r.oferta_final === 'no_evaluable') {
        noEvaluables++;
      } else if (r.oferta_final === 'rechazo') {
        rechazados++;
        conteoMotivos.set(r.motivo, (conteoMotivos.get(r.motivo) ?? 0) + 1);
      } else {
        aprobados++;
        limiteTarjetaTotal += r.limite_tarjeta ?? 0;
        montoCreditoTotal += r.monto_credito ?? 0;
      }

    
      const d = r.detalle;
      if (!d) continue;

      if (d.capacidad_pago >= POLITICA.CAPACIDAD_BUENA) {
        clientesBuenaCapacidad++;
      }

      if (esAprobado) {
        sumaIngresoAprobados += d.ingreso_mensual;
        sumaEdadAprobados += d.edad;
        sumaCapacidadAprobados += d.capacidad_pago;
        edadMinima = Math.min(edadMinima, d.edad);
        edadMaxima = Math.max(edadMaxima, d.edad);
      }

      if (d.grupo) {
        const g = porGrupo.get(d.grupo) ?? {
          total: 0,
          aprobados: 0,
          ingresos: 0,
          ratios: 0,
          capacidades: 0,
        };
        g.total++;
        if (esAprobado) g.aprobados++;
        g.ingresos += d.ingreso_mensual;
        g.ratios += d.ratio_deuda;
        g.capacidades += d.capacidad_pago;
        porGrupo.set(d.grupo, g);
      }
    }

    const total = clientes.length;
    const promedio = (suma: number, n: number) =>
      n === 0 ? 0 : Number((suma / n).toFixed(2));
    const pct = (parte: number, todo: number) =>
      todo === 0 ? 0 : Number(((parte / todo) * 100).toFixed(1));

    return {
      total_clientes: total,
      aprobados,
      rechazados,
      no_evaluables: noEvaluables,
      porcentaje_aprobacion: pct(aprobados, total),

      mix_ofertas: ORDEN_OFERTAS.filter((t) => conteoOfertas.has(t)).map(
        (tipo) => ({
          tipo,
          cantidad: conteoOfertas.get(tipo)!,
          porcentaje: pct(conteoOfertas.get(tipo)!, total),
        }),
      ),

      ingreso_promedio_aprobados: promedio(sumaIngresoAprobados, aprobados),
      edad_promedio_aprobados: promedio(sumaEdadAprobados, aprobados),
      edad_minima_aprobados: aprobados === 0 ? 0 : edadMinima,
      edad_maxima_aprobados: aprobados === 0 ? 0 : edadMaxima,
      capacidad_promedio_aprobados: promedio(sumaCapacidadAprobados, aprobados),
      clientes_buena_capacidad: clientesBuenaCapacidad,

      limite_tarjeta_total: limiteTarjetaTotal,
      monto_credito_total: montoCreditoTotal,
      exposicion_total: limiteTarjetaTotal + montoCreditoTotal,

      por_grupo: (['basico', 'bueno', 'excelente'] as Grupo[])
        .filter((g) => porGrupo.has(g))
        .map((grupo) => {
          const g = porGrupo.get(grupo)!;
          return {
            grupo,
            total: g.total,
            aprobados: g.aprobados,
            porcentaje_aprobacion: pct(g.aprobados, g.total),
            ingreso_promedio: promedio(g.ingresos, g.total),
            ratio_deuda_promedio: promedio(g.ratios, g.total),
            capacidad_promedio: promedio(g.capacidades, g.total),
          };
        }),

      motivos_rechazo: [...conteoMotivos.entries()]
        .map(([motivo, cantidad]) => ({
          motivo,
          cantidad,
          porcentaje: pct(cantidad, rechazados),
        }))
        .sort((a, b) => b.cantidad - a.cantidad),

      generado_en: new Date().toISOString(),
    };
  }
}
