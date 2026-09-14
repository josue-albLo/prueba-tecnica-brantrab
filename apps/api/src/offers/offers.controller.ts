import {
  Controller,
  DefaultValuePipe,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { EvaluacionesService } from './evaluaciones.service.js';
import type { OfferResult, RespuestaPaginada } from './interfaces/index.js';

@Controller('ofertas')
export class OfertasController {
  constructor(private readonly evaluacionesService: EvaluacionesService) {}

  @Get('evaluar-todos')
  evaluarTodos(
    @Query('limite', new DefaultValuePipe(100), ParseIntPipe) limite: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ): Promise<RespuestaPaginada<OfferResult>> {
    return this.evaluacionesService.evaluarTodos(limite, offset);
  }

  @Get('evaluar/:id')
  evaluarUno(@Param('id', ParseIntPipe) id: number): Promise<OfferResult> {
    return this.evaluacionesService.evaluarPorId(id);
  }

  @Get('exportar')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="resultado.csv"')
  async exportar(): Promise<string> {
    return '\uFEFF' + (await this.evaluacionesService.exportarCsv());
  }
}
