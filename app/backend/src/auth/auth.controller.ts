import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Headers,
  UseGuards,
  UnauthorizedException,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto, LoginDto, RootLoginDto, VerifyManagerDto } from './dto/auth.dto';
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
    return {
      success: true,
      message: 'Acceso root autorizado',
      rootToken: 'root-session-pos-authorized',
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: JwtPayload) {
    return this.authService.getMe(user.sub);
  }

  @Get('users')
  getUsers(
    @Headers('x-root-key') rootKey?: string,
    @Headers('authorization') authHeader?: string,
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

  @Delete('users/:id')
  deleteUser(@Headers('x-root-key') rootKey: string, @Param('id') id: string) {
    if (!rootKey || !this.authService.verifyRoot(rootKey)) {
      throw new UnauthorizedException('Requiere autenticación de administrador root');
    }
    return this.authService.deleteUser(id);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('worker/login')
  workerLogin(@Body() dto: LoginDto) {
    return this.authService.workerLogin(dto);
  }

  @Post('verify-manager')
  verifyManager(@Body() dto: VerifyManagerDto) {
    return this.authService.verifyManager(dto);
  }
}
