import { Link, usePage } from '@inertiajs/react';
import {
    LayoutGrid,
    BarChart3,
    Bell,
    AlertTriangle,
    Receipt,
    Landmark,
    Undo2,
    Users,
    ShoppingBag,
    Truck,
    ArrowRightLeft,
    Calculator,
    PackageSearch,
    Box,
    ClipboardList,
    FileSpreadsheet,
    UserCheck,
    Building,
    ShieldAlert,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import type { NavGroup, NavItem, SharedData } from '@/types';

export function AppSidebar() {
    const { auth } = usePage<SharedData>().props;
    const isSuperAdmin = auth.roles?.includes('Super Admin');
    const permissions = auth.permissions || [];
    const hasPerm = (p: string) => isSuperAdmin || permissions.includes(p);

    const pendingConflictsCount = Number((usePage().props as any).pending_conflicts_count || 0);
    const activeAlertsCount = Number((usePage().props as any).active_alerts_count || 0);

    // 1. General y Reportes
    const generalItems: NavItem[] = [];
    if (hasPerm('view_dashboard') || isSuperAdmin) {
        generalItems.push({
            title: 'Dashboard',
            href: dashboard.url(),
            icon: LayoutGrid,
        });
    }
    if (hasPerm('view_reports') || isSuperAdmin) {
        generalItems.push({
            title: 'Reportes',
            href: '/reports',
            icon: BarChart3,
        });
    }
    if (hasPerm('view_alerts') || isSuperAdmin) {
        generalItems.push({
            title: 'Alertas',
            href: '/alerts',
            icon: Bell,
            badge: activeAlertsCount > 0 ? activeAlertsCount : undefined,
        });
    }

    // 2. Comercial y Ventas
    const salesItems: NavItem[] = [];
    if (hasPerm('view_sales')) {
        salesItems.push({
            title: 'Ventas',
            href: '/sales',
            icon: Receipt,
        });
        salesItems.push({
            title: 'Cuentas por Cobrar',
            href: '/receivables',
            icon: Landmark,
        });
        salesItems.push({
            title: 'Devoluciones',
            href: '/customer-returns',
            icon: Undo2,
        });
    }
    if (hasPerm('view_customers')) {
        salesItems.push({
            title: 'Clientes',
            href: '/customers',
            icon: Users,
        });
    }

    // 3. Operaciones y Logística
    const operationsItems: NavItem[] = [];
    if (hasPerm('view_purchases')) {
        operationsItems.push({
            title: 'Compras',
            href: '/purchases',
            icon: ShoppingBag,
        });
    }
    if (hasPerm('view_suppliers')) {
        operationsItems.push({
            title: 'Proveedores',
            href: '/suppliers',
            icon: Truck,
        });
    }
    if (hasPerm('view_transfers')) {
        operationsItems.push({
            title: 'Transferencias',
            href: '/transfers',
            icon: ArrowRightLeft,
        });
    }
    if (hasPerm('view_closings') || isSuperAdmin) {
        operationsItems.push({
            title: 'Cierre Diario',
            href: '/closings',
            icon: Calculator,
        });
    }

    // 4. Inventario y Almacén
    const inventoryItems: NavItem[] = [];
    if (hasPerm('view_inventory') || hasPerm('view_inventory_general')) {
        inventoryItems.push({
            title: 'Inventario',
            href: '/inventory',
            icon: PackageSearch,
        });
    }
    if (hasPerm('view_products')) {
        inventoryItems.push({
            title: 'Repuestos',
            href: '/products',
            icon: Box,
        });
    }
    if (hasPerm('view_kardex')) {
        inventoryItems.push({
            title: 'Kardex',
            href: '/kardex',
            icon: ClipboardList,
        });
    }
    if (hasPerm('view_import')) {
        inventoryItems.push({
            title: 'Importar Catálogo',
            href: '/catalog/import',
            icon: FileSpreadsheet,
        });
    }

    // 5. Administración
    const adminItems: NavItem[] = [];
    if (hasPerm('view_users')) {
        adminItems.push({
            title: 'Usuarios',
            href: '/users',
            icon: UserCheck,
        });
    }
    if (hasPerm('view_branches')) {
        adminItems.push({
            title: 'Sucursales',
            href: '/branches',
            icon: Building,
        });
    }
    if (hasPerm('view_conflicts') || isSuperAdmin) {
        adminItems.push({
            title: 'Conflictos',
            href: '/conflicts',
            icon: ShieldAlert,
            badge: pendingConflictsCount > 0 ? pendingConflictsCount : undefined,
        });
    }

    const navGroups: NavGroup[] = [
        {
            title: 'General',
            items: generalItems,
        },
        {
            title: 'Comercial y Ventas',
            items: salesItems,
        },
        {
            title: 'Operaciones y Logística',
            items: operationsItems,
        },
        {
            title: 'Inventario y Almacén',
            items: inventoryItems,
        },
        {
            title: 'Administración',
            items: adminItems,
        },
    ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard.url()} prefetch>
                                <AppLogo forceDark={true} />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain groups={navGroups} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}