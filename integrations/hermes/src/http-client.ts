export const PRODUCTION_ORIGIN = "https://api.sanctrastudy.live/v1/agent";
export class SanctraError extends Error {
  constructor(
    public code: string,
    message: string,
    public retryable = false,
  ) {
    super(message);
    this.name = "SanctraError";
  }
}
const messages: Record<string, string> = {
  unauthenticated: "Agent credential was rejected.",
  forbidden: "This grant does not allow this operation.",
  expired: "Agent credential has expired.",
  conflict: "The saved version changed. Reload before retrying.",
  missing: "The requested record was not found.",
  validation: "The request was rejected.",
  rate_limited: "The request rate limit was reached.",
  unavailable: "Sanctra is unavailable.",
};
export function createSanctraClient(options: {
  token: string;
  fetchImpl?: typeof fetch;
  baseUrl?: string;
  timeoutMs?: number;
}) {
  if (
    !/^sanctra_agent_[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}$/.test(
      options.token ?? "",
    )
  )
    throw new SanctraError(
      "unauthenticated",
      "A valid agent credential is required.",
    );
  const base = options.baseUrl ?? PRODUCTION_ORIGIN;
  const parsed = new URL(base);
  if (
    base !== PRODUCTION_ORIGIN &&
    !(
      options.fetchImpl &&
      parsed.protocol === "http:" &&
      ["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname) &&
      !parsed.username &&
      !parsed.password &&
      !parsed.search &&
      !parsed.hash
    )
  )
    throw new SanctraError(
      "validation",
      "Only the fixed production origin or an injected loopback fixture is allowed.",
    );
  return {
    async request(
      method: string,
      path: string,
      options2: { query?: Record<string, unknown>; body?: unknown } = {},
    ) {
      if (
        !/^\/(?:[A-Za-z0-9_%.-]+\/?)*$/.test(path) ||
        path.includes("..") ||
        path.startsWith("//")
      )
        throw new SanctraError("validation", "Invalid API route.");
      const url = new URL(base.replace(/\/$/, "") + path);
      for (const [key, value] of Object.entries(options2.query ?? {}))
        if (value !== undefined) url.searchParams.set(key, String(value));
      const body =
        options2.body === undefined ? undefined : JSON.stringify(options2.body);
      if (body && Buffer.byteLength(body) > 262144)
        throw new SanctraError("validation", "Request exceeds the size limit.");
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(
            new SanctraError("unavailable", "Sanctra request timed out.", true),
          );
        }, options.timeoutMs ?? 15000);
      });
      const work = async () => {
        const response = await (options.fetchImpl ?? fetch)(url, {
          method,
          headers: {
            Authorization: `Bearer ${options.token}`,
            Accept: "application/json",
            ...(body ? { "Content-Type": "application/json" } : {}),
          },
          body,
          redirect: "error",
          signal: controller.signal,
        });
        if (response.status >= 300 && response.status < 400)
          throw new SanctraError("unavailable", "Sanctra refused a redirect.");
        const reader = response.body?.getReader();
        const chunks: Uint8Array[] = [];
        let size = 0;
        if (reader) {
          const cancel = () => {
            void reader.cancel().catch(() => {});
          };
          controller.signal.addEventListener("abort", cancel, { once: true });
          try {
            while (true) {
              if (controller.signal.aborted)
                throw new SanctraError(
                  "unavailable",
                  "Sanctra request timed out.",
                  true,
                );
              const { done, value } = await reader.read();
              if (done) break;
              size += value.byteLength;
              if (size > 1048576) {
                await reader.cancel();
                throw new SanctraError(
                  "unavailable",
                  "Sanctra response exceeds the size limit.",
                );
              }
              chunks.push(value);
            }
          } finally {
            controller.signal.removeEventListener("abort", cancel);
            reader.releaseLock();
          }
        }
        let result: any;
        try {
          result = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        } catch {
          throw new SanctraError(
            "unavailable",
            "Sanctra returned an invalid response.",
          );
        }
        if (!result || result.apiVersion !== "1" || typeof result !== "object")
          throw new SanctraError(
            "unavailable",
            "Sanctra returned an invalid response.",
          );
        if (!response.ok || result.error) {
          const code =
            typeof result.error?.code === "string" &&
            Object.hasOwn(messages, result.error.code)
              ? result.error.code
              : ((
                  {
                    401: "unauthenticated",
                    403: "forbidden",
                    404: "missing",
                    409: "conflict",
                    429: "rate_limited",
                  } as Record<number, string>
                )[response.status] ?? "unavailable");
          throw new SanctraError(
            code,
            messages[code],
            result.error?.retryable === true,
          );
        }
        if (!Object.hasOwn(result, "data"))
          throw new SanctraError(
            "unavailable",
            "Sanctra returned an invalid response.",
          );
        // Never echo the credential, even if a compromised upstream includes it in data.
        return JSON.parse(
          JSON.stringify(result).split(options.token).join("[REDACTED]"),
        ) as Record<string, unknown>;
      };
      try {
        return await Promise.race([work(), timeout]);
      } catch (error) {
        if (error instanceof SanctraError) throw error;
        throw new SanctraError("unavailable", "Sanctra request failed.", true);
      } finally {
        clearTimeout(timer);
        controller.abort();
      }
    },
  };
}
export type SanctraClient = ReturnType<typeof createSanctraClient>;
