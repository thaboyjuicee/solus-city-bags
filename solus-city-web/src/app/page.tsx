import { redirect } from "next/navigation";

// Root route — send visitors to the home screen
export default function RootPage() {
  redirect("/home");
}
