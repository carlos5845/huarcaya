import { Link } from '@inertiajs/react';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { NavGroup, NavItem } from '@/types';

interface NavMainProps {
    items?: NavItem[];
    groups?: NavGroup[];
}

export function NavMain({ items, groups }: NavMainProps) {
    const { isCurrentUrl } = useCurrentUrl();

    // If groups are provided, use them; otherwise, wrap items in a default group
    const navGroups: NavGroup[] = groups || (items && items.length > 0 ? [{ items }] : []);

    return (
        <div className="flex flex-col gap-1 py-1">
            {navGroups
                .filter((group) => group.items && group.items.length > 0)
                .map((group, groupIndex) => (
                    <SidebarGroup key={group.title || groupIndex} className="px-2 py-1">
                        {group.title && (
                            <SidebarGroupLabel className="text-[11px] font-bold tracking-wider text-muted-foreground/70 uppercase px-2 mb-0.5">
                                {group.title}
                            </SidebarGroupLabel>
                        )}
                        <SidebarMenu>
                            {group.items.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={isCurrentUrl(item.href)}
                                        tooltip={{ children: item.title }}
                                    >
                                        <Link href={item.href} prefetch className="flex items-center justify-between w-full">
                                            <div className="flex items-center gap-2.5">
                                                {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
                                                <span className="truncate">{item.title}</span>
                                            </div>
                                            {item.badge !== undefined && item.badge !== null ? (
                                                <span className="ml-auto inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white bg-amber-500 dark:bg-amber-600 rounded-full shadow-xs shrink-0">
                                                    {item.badge}
                                                </span>
                                            ) : null}
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroup>
                ))}
        </div>
    );
}
