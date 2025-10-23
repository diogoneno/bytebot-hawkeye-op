import { Module } from '@nestjs/common';
import { ComputerUseController } from './computer-use.controller';
import { ComputerUseService } from './computer-use.service';
import { OmniBoxClient } from './omnibox-client.service';

@Module({
  controllers: [ComputerUseController],
  providers: [ComputerUseService, OmniBoxClient],
  exports: [ComputerUseService, OmniBoxClient],
})
export class ComputerUseModule {}
