import { Controller, Get, Patch, Body, UseGuards, Delete, Post, Query, HttpCode } from '@nestjs/common';
import { UsersService } from './users.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Users')
@Controller('users/agents')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get agents' })
  async getAgents(@Query('includeInactive') includeInactive: boolean) {
    return this.usersService.getAgents(String(includeInactive) === 'true');
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create agent' })
  async createAgent(@Body() dto: any) {
    return this.usersService.createAgent(dto);
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update agent' })
  async updateAgent(@Body() dto: any) {
    return this.usersService.updateAgent(dto);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete agent' })
  async deleteAgent(@Query('id') id: number) {
    await this.usersService.deleteAgent(id);
  }

  @Patch('permissions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update agent permissions' })
  async updatePermissions(@Body() dto: any) {
      return this.usersService.updateAgentPermissions(dto);
  }
}
