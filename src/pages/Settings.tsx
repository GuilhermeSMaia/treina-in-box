import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserRole } from "@/hooks/useUserRole";
import { ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { UsersTab } from "@/components/settings/UsersTab";
import { InvitationsTab } from "@/components/settings/InvitationsTab";
import { TrainingsTab } from "@/components/settings/TrainingsTab";
import { EnrollmentsTab } from "@/components/settings/EnrollmentsTab";

export default function Settings() {
  const { isAdminOrOwner, isMentor } = useUserRole();

  //const showAllTabs = isAdminOrOwner;
  const showAllTabs = true;
  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        <PageHeader icon={ShieldCheck} title={showAllTabs ? "Configurações da Organização" : "Convites"} />

        {showAllTabs ? (
          <Tabs defaultValue="users">
            <TabsList>
              <TabsTrigger value="users">Usuários</TabsTrigger>
              <TabsTrigger value="invitations">Convites</TabsTrigger>
              <TabsTrigger value="trainings">Treinamentos</TabsTrigger>
              <TabsTrigger value="enrollments">Matrículas</TabsTrigger>
            </TabsList>
            <TabsContent value="users"><UsersTab /></TabsContent>
            <TabsContent value="invitations"><InvitationsTab /></TabsContent>
            <TabsContent value="trainings"><TrainingsTab /></TabsContent>
            <TabsContent value="enrollments"><EnrollmentsTab /></TabsContent>
          </Tabs>
        ) : (
          <InvitationsTab />
        )}
      </div>
    </AppLayout>
  );
}
