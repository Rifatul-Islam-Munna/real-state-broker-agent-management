import { Controller, Get, Patch, Body, UseGuards, Delete, Post, Query } from '@nestjs/common';
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
    return this.usersService.getAgents(includeInactive);
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
  @ApiOperation({ summary: 'Delete agent' })
  async deleteAgent(@Query('id') id: number) {
    return this.usersService.deleteAgent(id);
  }

  @Patch('permissions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update agent permissions' })
  async updatePermissions(@Body() dto: any) {
      return dto;
  }
}
