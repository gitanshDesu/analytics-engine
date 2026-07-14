import { redirect } from "next/navigation";

// TODO(Phase 3): once proxy.js gates on the accessToken cookie, this should
// redirect to /sites when already authenticated instead of always /login.
export default function Home() {
  redirect("/login");
}
