import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Cast to any to satisfy TypeScript in edge/runtime builds
const handler = (NextAuth as unknown as (opts: unknown) => unknown)(authOptions);

export { handler as GET, handler as POST };
