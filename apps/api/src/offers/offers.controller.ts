import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { OfertasService } from './offers.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller('ofertas')
export class OfertasController {
  constructor(
    private readonly ofertasService: OfertasService,
    private readonly prisma: PrismaService,
  ) {}

  private mapCliente(c: any) {
    return {
      id_cliente: c.id_cliente,
      edad: c.edad,
      ingreso_mensual:
        c.ingreso_mensual != null ? Number(c.ingreso_mensual) : null,
      indice_confiabilidad:
        c.indice_confiabilidad != null ? Number(c.indice_confiabilidad) : null,
      dias_atraso: c.dias_atraso,
      pago_mensual_deudas:
        c.pago_mensual_deudas != null ? Number(c.pago_mensual_deudas) : null,
      monto_solicitado:
        c.monto_solicitado != null ? Number(c.monto_solicitado) : null,
    };
  }

  @Get('evaluar-todos')
  async evaluarTodos() {
    const clientes = await this.prisma.cliente.findMany();
    return clientes.map((c) =>
      this.ofertasService.evaluarCliente(this.mapCliente(c)),
    );
  }

  @Get('evaluar/:id')
  async evaluarUno(@Param('id', ParseIntPipe) id: number) {
    const c = await this.prisma.cliente.findUnique({
      where: { id_cliente: id },
    });
    if (!c) return { error: 'Cliente no encontrado' };
    return this.ofertasService.evaluarCliente(this.mapCliente(c));
  }
}
