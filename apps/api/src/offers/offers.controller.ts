import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { EvaluacionesService } from './evaluaciones.service.js';
import type { OfferResult } from './interfaces/index.js';

@Controller('ofertas')
export class OfertasController {
  constructor(private readonly evaluacionesService: EvaluacionesService) {}

  @Get('evaluar-todos')
  evaluarTodos(
    @Query('limite', new DefaultValuePipe(100), ParseIntPipe) limite: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ): Promise<OfferResult[]> {
    return this.evaluacionesService.evaluarTodos(limite, offset);
  }

  @Get('evaluar/:id')
  evaluarUno(@Param('id', ParseIntPipe) id: number): Promise<OfferResult> {
    return this.evaluacionesService.evaluarPorId(id);
  }
}
