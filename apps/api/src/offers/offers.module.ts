import { Module } from '@nestjs/common';
import { OfertasService } from './offers.service.js';
import { OfertasController } from './offers.controller.js';


@Module({
  providers: [OfertasService],
  controllers: [OfertasController],
})
export class OfertasModule {}