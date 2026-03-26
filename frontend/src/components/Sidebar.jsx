import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Kanban,
  Building2,
  DollarSign,
  FileEdit,
  BarChart2,
  UserCog,
  Settings,
  X,
  ChevronRight,
  Zap,
} from "lucide-react";

const NAV_ITEMS = [
  {
    section: "Principal",
    items: [{ label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" }],
  },
  {
    section: "Comercial",
    items: [
      { label: "Leads", icon: Users, path: "/comercial/leads" },
      { label: "Pipeline", icon: Kanban, path: "/comercial/pipeline" },
    ],
  },
  {
    section: "Operações",
    items: [
      { label: "Clientes", icon: Building2, path: "/clientes" },
      { label: "Operacional", icon: BarChart2, path: "/operacional" },
      { label: "Conteúdo", icon: FileEdit, path: "/conteudo" },
    ],
  },
  {
    section: "Gestão",
    items: [
      { label: "Financeiro", icon: DollarSign, path: "/financeiro" },
      { label: "RH", icon: UserCog, path: "/rh" },
    ],
  },
];

export default function Sidebar({ onClose }) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 h-14 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center">
            <Zap size={14} className="text-primary-foreground" />
          </div>
          <span className="font-heading font-bold text-base tracking-tight">AgênciaOS</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-muted transition-colors md:hidden"
            data-testid="sidebar-close"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-hidden">
        {NAV_ITEMS.map((group) => (
          <div key={group.section} className="mb-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em] px-2 mb-2">
              {group.section}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={onClose}
                    data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, "-")}`}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )
                    }
                  >
                    <item.icon size={16} />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="shrink-0 border-t border-border p-3">
        <NavLink
          to="/configuracoes"
          onClick={onClose}
          data-testid="nav-configuracoes"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )
          }
        >
          <Settings size={16} />
          <span>Configurações</span>
        </NavLink>
      </div>
    </div>
  );
}
