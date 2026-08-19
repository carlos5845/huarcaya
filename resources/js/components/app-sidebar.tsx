import { Link, usePage } from '@inertiajs/react';
import { BookOpen, FolderGit2, LayoutGrid, Building, Users, Tags, LayoutList, Scale, PackageSearch, Box, FileSpreadsheet } from 'lucide-react';
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

export function AppSidebar() {
    const { auth } = usePage<SharedData>().props;
    const isSuperAdmin = auth.roles?.includes('Super Admin');

    const mainNavItems: NavItem[] = [
        {
            title: 'Dashboard',
            href: dashboard.url(),
            icon: LayoutGrid,
        },
    ];

    if (isSuperAdmin) {
        mainNavItems.push({
            title: 'Usuarios',
            href: '/users',
            icon: Users,
        });
        mainNavItems.push({
            title: 'Sucursales',
            href: '/branches',
            icon: Building,
        });
    }

    // Catalog items
    mainNavItems.push(
        {
            title: 'Inventario',
            href: '/inventory',
            icon: PackageSearch,
        },
        {
            title: 'Repuestos',
            href: '/products',
            icon: Box,
        },
        {
            title: 'Kardex',
            href: '/kardex',
            icon: PackageSearch,
        },
        {
            title: 'Compras',
            href: '/purchases',
            icon: FileSpreadsheet,
        },
        {
            title: 'Clientes',
            href: '/customers',
            icon: Users,
        },
        {
            title: 'Proveedores',
            href: '/suppliers',
            icon: Building,
        },
        {
            title: 'Importar Catálogo',
            href: '/catalog/import',
            icon: FileSpreadsheet,
        }
    );

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard.url()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
