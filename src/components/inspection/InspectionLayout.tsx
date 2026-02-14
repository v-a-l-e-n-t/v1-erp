import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import {
  SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter,
  SidebarGroup, SidebarGroupLabel, SidebarGroupContent,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton,
  SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton,
  SidebarMenuBadge, SidebarSeparator, SidebarInset, SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { useCurrentRonde, useOpenAnomalies } from '@/hooks/useInspection';
import { formatSemaineISO } from '@/utils/inspection';
import {
  LayoutDashboard, ClipboardCheck, FileCheck, History, Settings,
  ArrowLeft, AlertTriangle, ChevronRight,
} from 'lucide-react';

function PageTitle() {
  const { pathname } = useLocation();

  if (pathname === '/inspection') return 'Tableau de Bord';
  if (pathname.endsWith('/validation')) return 'Validation';
  if (pathname.includes('/inspection/ronde/')) return 'Saisie Ronde';
  if (pathname === '/inspection/historique') return 'Historique';
  if (pathname === '/inspection/configuration') return 'Configuration';
  return 'Inspection';
}

export default function InspectionLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { ronde: currentRonde, loading: rondeLoading } = useCurrentRonde();
  const { anomalies: openAnomalies } = useOpenAnomalies();

  const isActive = (path: string) => pathname === path;
  const isRondeActive = pathname.includes('/inspection/ronde/');

  const rondeLabel = currentRonde
    ? formatSemaineISO(currentRonde.semaine_iso)
    : 'Ronde';

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link to="/dashboard">
                  <ArrowLeft />
                  <span>Accueil</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <SidebarSeparator />
          <div className="px-3 py-2">
            <p className="text-sm font-semibold text-sidebar-foreground">Inspection</p>
            <p className="text-xs text-sidebar-foreground/60">Ronde hebdomadaire</p>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {/* Tableau de Bord */}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/inspection')}>
                    <Link to="/inspection">
                      <LayoutDashboard />
                      <span>Tableau de Bord</span>
                    </Link>
                  </SidebarMenuButton>
                  {openAnomalies.length > 0 && (
                    <SidebarMenuBadge className="bg-orange-100 text-orange-700">
                      {openAnomalies.length}
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuItem>

                {/* Ronde en cours */}
                {currentRonde && !rondeLoading && (
                  <Collapsible defaultOpen={isRondeActive} className="group/collapsible">
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton isActive={isRondeActive}>
                          <ClipboardCheck />
                          <span className="truncate">Ronde en cours</span>
                          <ChevronRight className="ml-auto h-4 w-4 shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive(`/inspection/ronde/${currentRonde.id}`)}
                            >
                              <Link to={`/inspection/ronde/${currentRonde.id}`}>
                                Saisie
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActive(`/inspection/ronde/${currentRonde.id}/validation`)}
                            >
                              <Link to={`/inspection/ronde/${currentRonde.id}/validation`}>
                                Validation
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                )}

                {/* Historique */}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/inspection/historique')}>
                    <Link to="/inspection/historique">
                      <History />
                      <span>Historique</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {/* Configuration */}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/inspection/configuration')}>
                    <Link to="/inspection/configuration">
                      <Settings />
                      <span>Configuration</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          {openAnomalies.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-orange-600 bg-orange-50 rounded-md mx-2 mb-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>{openAnomalies.length} anomalie{openAnomalies.length > 1 ? 's' : ''} ouverte{openAnomalies.length > 1 ? 's' : ''}</span>
            </div>
          )}
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-12 items-center gap-2 border-b bg-white px-4 sticky top-0 z-10">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
          <h1 className="text-sm font-semibold text-slate-800">
            <PageTitle />
          </h1>
        </header>

        <div className="flex-1 bg-slate-50/50">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
