import type { Server } from 'bun';

import { ApiErrorResponse }  from './adapters/http/ApiErrorResponse';
import { apiRouteTablesFor } from './apiRouteTables';
import {
  type ComposedRoutes,
  type HttpMethod,
  type RouteHandler,
  composeRouteTables,
} from './lib/route-table/composeRouteTables';
import type { ApiContext } from './services/ApiContext';
import { PortalError }     from './shared/errors/PortalError';

export interface ApiServerOptions {
  readonly context: ApiContext;
  /** 0 lets the system choose a free port. */
  readonly port:    number;
}

export type ApiServerVerdict =
  | { readonly outcome: 'started'; readonly server: Server<undefined> }
  | { readonly outcome: 'duplicateRoute'; readonly path: string; readonly method: HttpMethod };

function routeNotFound(request: Request): Response {
  return ApiErrorResponse.responseFor('routeNotFound', `No endpoint has the path ${new URL(request.url).pathname}.`);
}

function operationNotOffered(request: Request): Response {
  return ApiErrorResponse.responseFor('operationNotOffered', `The path ${new URL(request.url).pathname} does not offer ${request.method}.`);
}

function answeringPortalErrors(handler: RouteHandler): RouteHandler {
  return async (request) => {
    try {
      return await handler(request);
    } catch (error) {
      if (error instanceof PortalError) {
        return ApiErrorResponse.responseForPortalError(error);
      }
      throw error;
    }
  };
}

function withPortalErrorsAnswered(routes: ComposedRoutes): ComposedRoutes {
  return Object.fromEntries(Object.entries(routes).map(([path, handlersByMethod]) => [
    path,
    {
      GET:     answeringPortalErrors(handlersByMethod.GET),
      POST:    answeringPortalErrors(handlersByMethod.POST),
      PUT:     answeringPortalErrors(handlersByMethod.PUT),
      DELETE:  answeringPortalErrors(handlersByMethod.DELETE),
      PATCH:   answeringPortalErrors(handlersByMethod.PATCH),
      HEAD:    answeringPortalErrors(handlersByMethod.HEAD),
      OPTIONS: answeringPortalErrors(handlersByMethod.OPTIONS),
    },
  ]));
}

/**
 * Starts the API: the composed feature routes, `/api/*` and the fetch fallback answering 404
 * `routeNotFound`, a thrown `PortalError` answered through `ApiErrorResponse`, and any other thrown
 * error logged and answered 500 `internalError`.
 */
export function createApiServer({ context, port }: ApiServerOptions): ApiServerVerdict {
  const composedVerdict = composeRouteTables(apiRouteTablesFor(context), operationNotOffered);
  if (composedVerdict.outcome === 'duplicate') {
    return { outcome: 'duplicateRoute', path: composedVerdict.path, method: composedVerdict.method };
  }
  const server = Bun.serve({
    port,
    routes: {
      ...withPortalErrorsAnswered(composedVerdict.routes),
      '/api/*': routeNotFound,
    },
    fetch: routeNotFound,
    error(error) {
      context.log({ kind: 'requestFailed', errorMessage: error.message });
      return ApiErrorResponse.responseFor('internalError', 'An unexpected error occurred.');
    },
  });
  return { outcome: 'started', server };
}
