import { PageIntro } from "@/components/dashboard/page-intro";
import { PageShell } from "@/components/dashboard/page-shell";
import { ProfileEditor } from "@/components/dashboard/profile-editor";

export const dynamic = "force-dynamic";

export default function ProfilePage() {
  return (
    <PageShell>
      <PageIntro
        eyebrow="Profile"
        title="Kariyer profilini tek bir yerden yönet."
        subtitle="Job Tool eşleştirme ve başvuru akışlarında kullanılan yerel profile.json dosyasını anlaşılır form kontrolleriyle düzenle."
      />
      <ProfileEditor />
    </PageShell>
  );
}
