import { redirect } from "next/navigation";

// proxy.js already redirects unauthenticated requests to /login before this
// ever runs, so reaching here means the visitor has a valid session.
export default function Home() {
  redirect("/sites");
}
