import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { OfertasService } from './offers.service.js';
import { mapCliente } from './cliente.mapper.js';
import type { OfferResult, RespuestaPaginada } from './interfaces/index.js';

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
}
