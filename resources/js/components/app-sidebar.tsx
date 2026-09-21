import { Link, usePage } from '@inertiajs/react';
import { ArrowRightLeft, Landmark, Undo2 } from 'lucide-react';
import { BookOpen, FolderGit2, LayoutGrid, Building, Users, Tags, LayoutList, Scale, PackageSearch, Box, FileSpreadsheet, ClipboardList } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
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
import type { NavItem, SharedData } from '@/types';
/*
const footerNavItems: NavItem[] = [
    {
        title: 'Repository',
        href: 'https://github.com/laravel/react-starter-kit',
        icon: FolderGit2,
    },
    {
        title: 'Documentation',
        href: 'https://laravel.com/docs/starter-kits#react',
        icon: BookOpen,
    },
];
* */


export function AppSidebar() {
    const { auth } = usePage<SharedData>().props;
    const isSuperAdmin = auth.roles?.includes('Super Admin');
    const permissions = auth.permissions || [];
    const hasPerm = (p: string) => isSuperAdmin || permissions.includes(p);

    const mainNavItems: NavItem[] = [];

    if (hasPerm('view_dashboard') || isSuperAdmin) {
        mainNavItems.push({
            title: 'Dashboard',
            href: dashboard.url(),
            icon: LayoutGrid,
        });
    }

    if (hasPerm('view_users')) {
        mainNavItems.push({
            title: 'Usuarios',
            href: '/users',
            icon: Users,
        });
    }
    
    if (hasPerm('view_branches')) {
        mainNavItems.push({
            title: 'Sucursales',
            href: '/branches',
            icon: Building,
        });
    }

    if (hasPerm('view_inventory') || hasPerm('view_inventory_general')) {
        mainNavItems.push({
            title: 'Inventario',
            href: '/inventory',
            icon: PackageSearch,
        });
    }

    if (hasPerm('view_products')) {
        mainNavItems.push({
            title: 'Repuestos',
            href: '/products',
            icon: Box,
        });
    }

    if (hasPerm('view_kardex')) {
        mainNavItems.push({
            title: 'Kardex',
            href: '/kardex',
            icon: PackageSearch,
        });
    }

    //     if (hasPerm('view_adjustments')) {
    //         mainNavItems.push({
    //             title: 'Ajustes',
    //             href: '/inventory/adjustments',
    //             icon: ClipboardList,
    //         });
    //     }

    if (hasPerm('view_purchases')) {
        mainNavItems.push({
            title: 'Compras',
            href: '/purchases',
            icon: FileSpreadsheet,
        });
    }

    if (hasPerm('view_sales')) {
        mainNavItems.push({
            title: 'Ventas',
            href: '/sales',
            icon: FileSpreadsheet,
        });
        
        mainNavItems.push({
            title: 'Cuentas por Cobrar',
            href: '/receivables',
            icon: Landmark,
        });
        
        mainNavItems.push({
            title: 'Devoluciones',
            href: '/customer-returns',
            icon: Undo2,
        });
    }

    if (hasPerm('view_transfers')) {
        mainNavItems.push({
            title: 'Transferencias',
            href: '/transfers',
            icon: ArrowRightLeft,
        });
    }

    if (hasPerm('view_customers')) {
        mainNavItems.push({
            title: 'Clientes',
            href: '/customers',
            icon: Users,
        });
    }

    if (hasPerm('view_suppliers')) {
        mainNavItems.push({
            title: 'Proveedores',
            href: '/suppliers',
            icon: Building,
        });
    }

    if (hasPerm('view_import')) {
        mainNavItems.push({
            title: 'Importar Catálogo',
            href: '/catalog/import',
            icon: FileSpreadsheet,
        });
    }

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
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}