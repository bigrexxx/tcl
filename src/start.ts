import { renderErrorPage } from "./lib/error-page";

// The TanStack Start API surface has changed between versions. For typing
// purposes (route generation) we export a minimal `startInstance` with a
// `getOptions` function. The runtime start handler is provided by
// TanStack packages and configured during build; this placeholder keeps
// the generated types satisfied.
export const startInstance = {
  getOptions: async () => ({}) as const,
};
