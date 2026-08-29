import { Link, usePage } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import { ArrowLeft } from 'lucide-react';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSplitLayout({
    children,
    title,
    description,
    showBackArrow,
}: AuthLayoutProps) {
    const { name } = usePage().props;

    return (
        <div className="relative grid h-dvh flex-col items-center justify-center px-8 sm:px-0 lg:max-w-none lg:grid-cols-2 lg:px-0">
            <div className="relative hidden h-full flex-col bg-zinc-900 p-10 text-white lg:flex dark:border-r overflow-hidden items-center justify-center">
                {/* Subtle gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900" />

                {/* Decorative circles */}
                <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-blue-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-purple-500/10 rounded-full blur-3xl" />

                <div className="relative z-20 flex flex-col items-center gap-6">
                    <img src="/logo-dark-huarcaya.png" alt="Huarcaya" className="w-64 drop-shadow-2xl opacity-90 transition-transform hover:scale-105 duration-500" />
                    <div className="text-center space-y-2 mt-4">
                        <h2 className="text-2xl font-bold tracking-tight text-white/90">Sistema de Gestión Integrado</h2>
                        <p className="text-zinc-400 text-sm max-w-sm">
                            Control total sobre ventas, compras, kardex e inventarios con tecnología moderna y eficiente.
                        </p>
                    </div>
                </div>

                <Link
                    href={home()}
                    className="absolute top-10 left-10 z-20 flex items-center text-lg font-medium text-white/80 hover:text-white transition-colors"
                >
                    <AppLogoIcon className="mr-2 size-6 fill-current" />
                    {name}
                </Link>
            </div>
            <div className="w-full lg:p-8">
                <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
                    <Link
                        href={home()}
                        className="relative z-20 flex flex-col items-center justify-center lg:hidden gap-3 mb-6"
                    >
                        <img src="/logo-huarcaya.webp" alt="Huarcaya" className="h-16 w-auto object-contain block dark:hidden" />
                        <img src="/logo-dark.png" alt="Huarcaya" className="h-16 w-auto object-contain hidden dark:block" />
                    </Link>
                    <div className="flex flex-col items-start gap-2 text-left sm:items-center sm:text-center relative">
                        {showBackArrow && (
                            <Link href={home()} className="absolute -left-2 top-0 p-2 text-muted-foreground hover:text-foreground transition-colors sm:hidden">
                                <ArrowLeft className="h-5 w-5" />
                            </Link>
                        )}
                        <h1 className="text-xl font-medium flex items-center gap-2">
                            {showBackArrow && (
                                <Link href={home()} className="hidden sm:inline-flex text-muted-foreground hover:text-foreground transition-colors">
                                    <ArrowLeft className="h-5 w-5" />
                                </Link>
                            )}
                            {title}
                        </h1>
                        <p className="text-sm text-balance text-muted-foreground">
                            {description}
                        </p>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
