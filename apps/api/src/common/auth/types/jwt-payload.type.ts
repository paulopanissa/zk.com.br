import { SystemRole } from '@prisma/client';

export interface JwtSystemPayload {
  sub: string;
  realm: 'system';
  role: SystemRole;
  unidade_id: string | null;
  iat?: number;
  exp?: number;
}

export interface JwtSystemRefreshPayload {
  sub: string;
  realm: 'system';
  jti: string;
  iat?: number;
  exp?: number;
}
