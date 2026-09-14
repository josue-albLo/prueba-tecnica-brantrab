import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';

import { EvaluacionesService } from './evaluaciones.service.js';
import { OfertasController } from './offers.controller.js';
import { OfertasService } from './offers.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [OfertasController],
  providers: [OfertasService, EvaluacionesService],
  exports: [OfertasService],
})
export class OfertasModule {}
