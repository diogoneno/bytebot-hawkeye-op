import { Module } from '@nestjs/common';
import { ComputerUseModule } from './computer-use/computer-use.module';

@Module({
  imports: [ComputerUseModule],
})
export class AppModule {}
