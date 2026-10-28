import {
  LayoutDashboard,
  BookOpen,
  User,
  LogOut,
  ArrowLeft,
  Video,
  FileText,
  MessageSquare,
  Notebook,
  Settings,
  ChevronsUpDown,
} from "lucide-react";
import logo from "@/assets/logo.png";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useTrainings } from "@/hooks/useTrainings";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useProfile } from "@/hooks/useProfile";
import { getFullName, getInitials } from "@/lib/names";

const mainNavItems = [
  { title: "Lobby", url: "/lobby", icon: LayoutDashboard },
  { title: "Treinamentos", url: "/treinamentos", icon: BookOpen },
];

const getTrainingNavItems = (trainingId: string) => [
  { title: "Aulas", url: `/treino/${trainingId}/aulas`, icon: Video },
  { title: "Conteúdo", url: `/treino/${trainingId}/conteudo`, icon: FileText },
  { title: "Praça", url: `/treino/${trainingId}/praca`, icon: MessageSquare },
  { title: "Meu Espaço", url: `/treino/${trainingId}/meu-espaco`, icon: Notebook },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const { isAdminOrOwner, isMentor } = useUserRole();
  const { data: trainings } = useTrainings();

  const trainingMatch = location.pathname.match(/^\/treino\/([^/]+)/);
  const trainingId = trainingMatch?.[1] ?? null;
  const isTrainingContext = !!trainingId;

  const trainingName = trainingId
    ? (trainings?.find((t) => t.id === trainingId)?.title ?? `Treino`)
    : "";

  const navItems = isTrainingContext && trainingId
    ? getTrainingNavItems(trainingId)
    : mainNavItems;
  const initials = getInitials(getFullName(profile, ""));


  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="flex items-center gap-2.5 px-4 py-4">
          {isTrainingContext ? (
            <>
              <button
                onClick={() => navigate("/lobby")}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-sidebar-border/30 bg-sidebar-accent hover:bg-sidebar-accent/80 transition-colors"
                title="Voltar ao Lobby"
              >
                <ArrowLeft className="h-4 w-4 text-sidebar-foreground" />
              </button>
              {!collapsed && (
                <span className="text-sm font-semibold text-sidebar-foreground tracking-tight truncate">
                  {trainingName}
                </span>
              )}
            </>
          ) : (
            <>
              <img src={logo} alt="Treina in Box" className="h-8 w-8 shrink-0 rounded-lg" />
              {!collapsed && (
                <span className="text-sm font-semibold text-sidebar-foreground tracking-tight">
                  Treina in Box
                </span>
              )}
            </>
          )}
        </div>

        <Separator className="bg-sidebar-border/30" />

        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-medium uppercase tracking-wider text-gold">
            {isTrainingContext ? "Seções" : "Menu"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-gold transition-colors"
                      activeClassName="bg-sidebar-accent text-gold font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <Separator className="bg-sidebar-border/30 mb-2" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2.5 px-2 pb-2 rounded-md hover:bg-sidebar-accent transition-colors outline-none">
              <Avatar className="h-7 w-7">
                <AvatarImage src={profile?.avatar_url || user?.user_metadata?.avatar_url || undefined} className="object-cover" />
                <AvatarFallback className="bg-sidebar-accent text-gold text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-medium text-sidebar-foreground truncate">
                    {getFullName(profile, "Usuário")}
                  </p>
                  <p className="text-[10px] text-gold-muted truncate">
                    {user?.email}
                  </p>
                </div>
              )}
              {!collapsed && (
                <ChevronsUpDown className="h-3.5 w-3.5 text-sidebar-foreground/50 shrink-0" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-48">
            <DropdownMenuItem onClick={() => navigate("/perfil")} className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              Perfil
            </DropdownMenuItem>
            {/* {(isAdminOrOwner || isMentor) && ( */}
              <DropdownMenuItem onClick={() => navigate("/configuracoes")} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Configurações
              </DropdownMenuItem>
            {/* )} */}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}