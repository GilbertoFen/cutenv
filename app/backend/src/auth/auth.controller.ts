import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto, LoginDto, RootLoginDto, VerifyManagerDto } from './dto/auth.dto';

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

  @Get('users')
  getUsers(@Headers('x-root-key') rootKey?: string) {
    if (!rootKey || !this.authService.verifyRoot(rootKey)) {
      throw new UnauthorizedException('Requiere autenticación de administrador root');
    }
    return this.authService.getAllUsers();
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
