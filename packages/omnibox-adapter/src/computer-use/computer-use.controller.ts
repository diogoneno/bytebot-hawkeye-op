import {
  Controller,
  Post,
  Get,
  Body,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ComputerUseService } from './computer-use.service';
import { OmniBoxClient } from './omnibox-client.service';
import { ComputerAction } from '@bytebot/shared';

/**
 * Computer Use Controller - Windows Desktop Control
 *
 * Provides bytebotd-compatible API for OmniBox/Windows desktop
 */
@Controller('computer-use')
export class ComputerUseController {
  private readonly logger = new Logger(ComputerUseController.name);

  constructor(
    private readonly computerUseService: ComputerUseService,
    private readonly omniboxClient: OmniBoxClient,
  ) {}

  @Get()
  async health() {
    return { status: 'ok', service: 'omnibox-adapter' };
  }

  @Get('setup/status')
  async setupStatus() {
    try {
      return await this.omniboxClient.getSetupStatus();
    } catch (error) {
      this.logger.error(
        `Error getting setup status: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        `Failed to get setup status: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  async action(@Body() params: ComputerAction) {
    try {
      // Don't log sensitive data
      const paramsCopy = { ...params };
      if (params.action === 'type_text' && (params as any).isSensitive) {
        (paramsCopy as any).text = '[REDACTED]';
      }

      this.logger.log(`Computer action request: ${JSON.stringify(paramsCopy)}`);
      return await this.computerUseService.action(params);
    } catch (error) {
      this.logger.error(
        `Error executing computer action: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        `Failed to execute computer action: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
