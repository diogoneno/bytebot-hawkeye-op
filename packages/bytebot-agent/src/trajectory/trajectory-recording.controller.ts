import { Controller, Get, Post } from '@nestjs/common';
import { TrajectoryRecorderService } from './trajectory-recorder.service';

/**
 * Controller for trajectory recording management
 *
 * Provides endpoints for:
 * - Checking recording status
 * - Viewing trajectory statistics
 * - Pausing/resuming recording
 */
@Controller('trajectory-recording')
export class TrajectoryRecordingController {
  constructor(
    private readonly trajectoryRecorder: TrajectoryRecorderService,
  ) {}

  /**
   * Get current recording status
   */
  @Get('status')
  async getStatus() {
    const enabled = this.trajectoryRecorder.isEnabled();
    const paused = this.trajectoryRecorder.isPaused();
    const activeCount = this.trajectoryRecorder.getActiveCount();

    return {
      enabled,
      paused,
      recording: enabled && !paused,
      activeCount,
    };
  }

  /**
   * Get trajectory statistics
   */
  @Get('stats')
  async getStats() {
    const stats = await this.trajectoryRecorder.getStatistics();

    return {
      total: stats.total,
      successRate: Math.round(stats.successRate * 100) / 100,
      averageQuality: Math.round(stats.averageQuality * 100) / 100,
      byProvider: stats.byProvider,
    };
  }

  /**
   * Pause trajectory recording
   */
  @Post('pause')
  async pause() {
    this.trajectoryRecorder.pause();
    return {
      success: true,
      paused: true,
      message: 'Trajectory recording paused',
    };
  }

  /**
   * Resume trajectory recording
   */
  @Post('resume')
  async resume() {
    this.trajectoryRecorder.resume();
    return {
      success: true,
      paused: false,
      message: 'Trajectory recording resumed',
    };
  }
}
