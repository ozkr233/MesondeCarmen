import { TeamCard } from "@/components/admin/TeamCard";
import { currentUserId, listAdmins } from "@/lib/admins";

export const metadata = { title: "Equipo | El Mesón de Carmen" };

export default async function AdminTeamPage() {
  const [members, userId] = await Promise.all([listAdmins(), currentUserId()]);

  return <TeamCard members={members} currentUserId={userId} />;
}
