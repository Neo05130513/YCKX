import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { MockService } from "./mock.service";

@Injectable()
export class MockAuthGuard implements CanActivate {
  constructor(private readonly mockService: MockService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<any>();
    const method = String(request.method || "GET").toUpperCase();
    if (method === "OPTIONS") return true;

    const path = String(request.path || request.url || "/").split("?")[0];
    const mockPath = path.replace(/^\/api\/mock/, "") || "/";
    if (this.isPublicRoute(method, mockPath)) return true;

    const token = this.extractBearerToken(request.headers?.authorization);
    const auth = this.mockService.verifyAuthToken(token);
    this.mockService.assertMockAccess(auth, method, mockPath);
    request.mockAuth = auth;
    return true;
  }

  private isPublicRoute(method: string, path: string) {
    return (
      (method === "POST" &&
        (path === "/auth/login" || path === "/auth/customer-login")) ||
      (method === "GET" && path.startsWith("/files/"))
    );
  }

  private extractBearerToken(header: unknown) {
    const value = Array.isArray(header) ? header[0] : String(header || "");
    const match = value.match(/^Bearer\s+(.+)$/i);
    return match?.[1];
  }
}
