import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

/**
 * Like JwtAuthGuard, but never rejects the request. `req.user` is populated
 * when a valid bearer token is present, and left `undefined` for guests —
 * used by routes that work for both (e.g. the AI assistant, which tracks
 * usage per-user when logged in and per-client-id otherwise).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  override canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  override handleRequest<TUser = unknown>(_err: Error | null, user: TUser): TUser {
    return user;
  }
}
