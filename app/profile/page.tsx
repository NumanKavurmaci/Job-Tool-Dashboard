import { PageIntro } from "@/components/dashboard/page-intro";
import { PageShell } from "@/components/dashboard/page-shell";
import { ProfileEditor } from "@/components/dashboard/profile-editor";

export const dynamic = "force-dynamic";

export default function ProfilePage() {
  return (
    <PageShell>
      <PageIntro
        eyebrow="Profile"
        title="Manage your career profile in one place."
        subtitle="Edit the local profile.json used by Job Tool matching and application flows with clear, structured controls."
      />
      <ProfileEditor />
    </PageShell>
  );
}
