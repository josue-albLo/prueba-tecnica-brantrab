import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { OfferResult } from './interfaces/index.js';
import { OfertasService } from './offers.service.js';
import { mapCliente } from './cliente.mapper.js';

@Injectable()
export class EvaluacionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ofertasService: OfertasService,
  ) {}

  async evaluarTodos(limite = 100, offset = 0): Promise<OfferResult[]> {
    const clientes = await this.prisma.cliente.findMany({
      take: limite,
      skip: offset,
      orderBy: { id_cliente: 'asc' },
    });

    return clientes.map((c) =>
      this.ofertasService.evaluarCliente(mapCliente(c)),
    );
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
