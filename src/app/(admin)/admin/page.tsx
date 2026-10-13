import { redirect } from "next/navigation";

// One address for staff to remember: /admin. The admin layout above has already sent anyone who
// isn't a signed-in admin to the login page or the home page, so only admins get this far.
export default function AdminEntry() {
  redirect("/dashboard");
}
