import { useSearchParams } from "@/lib/router";
import { RETURN_PARAM, safeReturnPath } from "@/lib/loginReturn";

/** The page to go back to after logging in (the service page the visitor tried to book from), or
 *  null for the usual landing in the client app. Pages using it need a <Suspense> boundary. */
export function useLoginReturn(): string | null {
  const [params] = useSearchParams();
  return safeReturnPath(params.get(RETURN_PARAM));
}
