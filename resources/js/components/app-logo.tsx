import { usePage } from '@inertiajs/react';

import AppLogoIcon from '@/components/app-logo-icon';

export default function AppLogo() {
    const { name } = usePage().props;

    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                <AppLogoIcon className="size-5" />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <img src="/logo-text.png" alt={name as string} className="h-6 w-auto object-contain block dark:hidden" />
                <img src="/logo-dark-text.png" alt={name as string} className="h-6 w-auto object-contain hidden dark:block" />
            </div>
        </>
    );
}
