import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtSystemPayload } from '../types/jwt-payload.type';

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): JwtSystemPayload => {
    return ctx.switchToHttp().getRequest().user;
  },
);
