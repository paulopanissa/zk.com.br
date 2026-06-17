import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtSystemPayload } from '../types/jwt-payload.type';

@Injectable()
export class JwtSystemStrategy extends PassportStrategy(Strategy, 'jwt-system') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SYSTEM_SECRET'),
    });
  }

  validate(payload: JwtSystemPayload): JwtSystemPayload {
    if (payload.realm !== 'system') {
      throw new UnauthorizedException('Token inválido para este realm');
    }
    return payload;
  }
}
