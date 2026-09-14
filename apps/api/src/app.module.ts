import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { OfertasModule } from './offers/offers.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [PrismaModule, OfertasModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
