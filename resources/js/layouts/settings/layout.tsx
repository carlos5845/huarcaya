import { Link } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';
import { edit } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';
import { User, ShieldCheck } from 'lucide-react';
import type { NavItem } from '@/types';

const sidebarNavItems: Array<{ title: string; href: string; icon: any }> = [
    {
        title: 'Mi Perfil',
        href: edit(),
        icon: User,
    },
    {
        title: 'Seguridad y Acceso',
        href: editSecurity(),
        icon: ShieldCheck,
    },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();

    return (
        <div className="px-4 py-6 max-w-6xl mx-auto w-full">
            <div className="mb-6">
                <Heading
                    title="Configuración de Cuenta"
                    description="Gestiona tu información personal, identidad, credenciales y opciones de seguridad"
                />
            </div>

            <div className="flex flex-col lg:flex-row lg:space-x-8">
                <aside className="w-full lg:w-60 shrink-0">
                    <nav
                        className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0"
                        aria-label="Settings"
                    >
                        {sidebarNavItems.map((item, index) => {
                            const Icon = item.icon;
                            const active = isCurrentOrParentUrl(item.href);
                            return (
                                <Button
                                    key={`${toUrl(item.href)}-${index}`}
                                    size="sm"
                                    variant={active ? 'secondary' : 'ghost'}
                                    asChild
                                    className={cn(
                                        'justify-start h-10 px-3 text-xs font-semibold gap-2.5 rounded-lg transition-all',
                                        active ? 'bg-primary/10 text-primary hover:bg-primary/15 font-bold shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    <Link href={item.href}>
                                        <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground')} />
                                        <span>{item.title}</span>
                                    </Link>
                                </Button>
                            );
                        })}
                    </nav>
                </aside>

                <Separator className="my-6 lg:hidden" />

                <div className="flex-1 min-w-0">
                    <section className="space-y-6">
                        {children}
                    </section>
                </div>
            </div>
        </div>
    );
}
