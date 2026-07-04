import { Body, Controller, Get, Headers, HttpCode, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SmsService } from './sms.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('SMS')
@Controller()
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  @Get('sms-inbox')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get synced SMS inbox' })
  async findAll(@Query('id') id?: number, @Query('page') page = 1, @Query('pageSize') pageSize = 20, @Query('search') search?: string, @Query('direction') direction?: string) {
    if (id) return this.smsService.findOne(Number(id));
    return this.smsService.findAll(Number(page), Number(pageSize), search, direction);
  }

  @Post('sms-inbox/send')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Send SMS' })
  async send(@Body() dto: any) {
    return this.smsService.send(dto);
  }

  @Post('sms-inbox/sync')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Manually sync SMS messages' })
  async sync() {
    return this.smsService.syncProviderMessages();
  }

  @Post('sms-webhooks/:provider')
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive SMS provider webhooks' })
  async webhook(@Param('provider') provider: string, @Body() body: any, @Headers() headers: Record<string, any>, @Res() res: any) {
    const result: any = await this.smsService.ingestWebhook(provider, body, headers);
    if (result.validationToken) res.setHeader('Validation-Token', result.validationToken);
    if (['twilio', 'plivo'].includes(provider.toLowerCase())) {
      return res.type('application/xml; charset=utf-8').send('<Response></Response>');
    }
    return res.json({ ok: true });
  }
}
