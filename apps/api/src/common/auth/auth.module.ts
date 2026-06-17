import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtSystemGuard } from './guards/jwt-system.guard';
import { RolesGuard } from './guards/roles.guard';
import { JwtSystemStrategy } from './strategies/jwt-system.strategy';
import { SystemUsersController } from './system-users.controller';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SYSTEM_SECRET'),
        signOptions: { expiresIn: Number(config.get('JWT_ACCESS_TTL', '900')) },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, SystemUsersController],
  providers: [AuthService, JwtSystemStrategy, JwtSystemGuard, RolesGuard],
  exports: [JwtSystemGuard, RolesGuard],
})
export class AuthModule {}
