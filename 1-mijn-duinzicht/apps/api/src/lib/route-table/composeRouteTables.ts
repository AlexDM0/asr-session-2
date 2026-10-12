import type { BunRequest } from 'bun';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export type RouteHandler = (request: BunRequest) => Response | Promise<Response>;

/** A feature's routes: path → the methods it offers. A path declared with no methods answers every method as not offered. */
export type RouteTable = Readonly<Record<string, Partial<Record<HttpMethod, RouteHandler>>>>;

export type ComposedRoutes = Record<string, Record<HttpMethod, RouteHandler>>;

export type ComposedRoutesVerdict =
  | { readonly outcome: 'composed'; readonly routes: ComposedRoutes }
  | { readonly outcome: 'duplicate'; readonly path: string; readonly method: HttpMethod };

const HTTP_METHODS: readonly HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

/**
 * Merges route tables into one routes object for `Bun.serve` and fills every method a path does not
 * offer with `methodNotOffered`, because Bun would otherwise pass such a request on to a wildcard route.
 */
export function composeRouteTables(tables: readonly RouteTable[], methodNotOffered: RouteHandler): ComposedRoutesVerdict {
  const offeredHandlers = new Map<string, Partial<Record<HttpMethod, RouteHandler>>>();
  for (const table of tables) {
    for (const [path, handlersByMethod] of Object.entries(table)) {
      const mergedHandlers = offeredHandlers.get(path) ?? {};
      for (const method of HTTP_METHODS) {
        const handler = handlersByMethod[method];
        if (handler === undefined) {
          continue;
        }
        if (mergedHandlers[method] !== undefined) {
          return { outcome: 'duplicate', path, method };
        }
        mergedHandlers[method] = handler;
      }
      offeredHandlers.set(path, mergedHandlers);
    }
  }
  const routes: ComposedRoutes = {};
  for (const [path, handlersByMethod] of offeredHandlers) {
    routes[path] = {
      GET:     handlersByMethod.GET ?? methodNotOffered,
      POST:    handlersByMethod.POST ?? methodNotOffered,
      PUT:     handlersByMethod.PUT ?? methodNotOffered,
      DELETE:  handlersByMethod.DELETE ?? methodNotOffered,
      PATCH:   handlersByMethod.PATCH ?? methodNotOffered,
      HEAD:    handlersByMethod.HEAD ?? methodNotOffered,
      OPTIONS: handlersByMethod.OPTIONS ?? methodNotOffered,
    };
  }
  return { outcome: 'composed', routes };
}
