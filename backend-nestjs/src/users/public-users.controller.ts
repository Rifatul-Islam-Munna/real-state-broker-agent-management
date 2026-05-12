import { Controller, Get } from '@nestjs/common';
import { UsersService } from './users.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Public')
@Controller('public')
export class PublicUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('agents')
  @ApiOperation({ summary: 'Get public agent profiles' })
  async getPublicAgents() {
    return this.usersService.getPublicAgents();
  }
}
