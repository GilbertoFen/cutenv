import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Headers,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import {
  CreateUserDto,
  LoginDto,
  RootLoginDto,
  VerifyManagerDto,
  AcceptInvitationDto,
  ConfirmPasswordResetDto,
  RequestPasswordResetDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtPayload } from './jwt.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('root/login')
  rootLogin(@Body() dto: RootLoginDto) {
    const valid = this.authService.verifyRoot(dto.rootPassword);
    if (!valid) {
      throw new UnauthorizedException('Contraseña de administrador root incorrecta');
    }
    return this.authService.login({ username: 'root', password: dto.rootPassword });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: JwtPayload) {
    return this.authService.getMe(user.sub);
  }

  @Post('heartbeat')
  @UseGuards(JwtAuthGuard)
  heartbeat(@CurrentUser() user: JwtPayload) {
    return this.authService.heartbeat(user.sub, user.sessionId);
  }

  @Get('users')
  getUsers(
    @Headers('x-root-key') rootKey?: string,
  ) {
    if (rootKey && this.authService.verifyRoot(rootKey)) {
      return this.authService.getAllUsers();
    }
    throw new UnauthorizedException('Requiere autenticación de administrador root');
  }

  @Post('users')
  createUser(@Headers('x-root-key') rootKey: string, @Body() dto: CreateUserDto) {
    if (!rootKey || !this.authService.verifyRoot(rootKey)) {
      throw new UnauthorizedException('Requiere autenticación de administrador root');
    }
    return this.authService.createUser(dto);
  }

  @Patch('users/:id/toggle-status')
  toggleUserStatus(@Headers('x-root-key') rootKey: string, @Param('id') id: string) {
    if (!rootKey || !this.authService.verifyRoot(rootKey)) {
      throw new UnauthorizedException('Requiere autenticación de administrador root');
    }
    return this.authService.toggleUserStatus(id);
  }

  @Delete('users/:id')
  deleteUser(@Headers('x-root-key') rootKey: string, @Param('id') id: string) {
    if (!rootKey || !this.authService.verifyRoot(rootKey)) {
      throw new UnauthorizedException('Requiere autenticación de administrador root');
    }
    return this.authService.deleteUser(id);
  }

  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    const ip = req.ip || req.socket.remoteAddress;
    const ua = req.headers['user-agent'];
    return this.authService.login(dto, ip, ua);
  }

  @Post('worker/login')
  workerLogin(@Body() dto: LoginDto, @Req() req: Request) {
    const ip = req.ip || req.socket.remoteAddress;
    const ua = req.headers['user-agent'];
    return this.authService.workerLogin(dto, ip, ua);
  }

  @Post('verify-manager')
  verifyManager(@Body() dto: VerifyManagerDto) {
    return this.authService.verifyManager(dto);
  }

  @Get('invitation/:token')
  validateInvitation(@Param('token') token: string) {
    return this.authService.validateInvitation(token);
  }

  @Post('invitation/accept')
  acceptInvitation(@Body() dto: AcceptInvitationDto) {
    return this.authService.acceptInvitation(dto);
  }

  @Post('password-reset/request')
  requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.submitPasswordResetRequest(dto);
  }

  @Get('password-reset/:token')
  validatePasswordReset(@Param('token') token: string) {
    return this.authService.validatePasswordResetToken(token);
  }

  @Post('password-reset/confirm')
  confirmPasswordReset(@Body() dto: ConfirmPasswordResetDto) {
    return this.authService.confirmPasswordReset(dto);
  }
}
