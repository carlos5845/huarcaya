import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import type { BreadcrumbItem } from '@/types';
import { useFlashToast } from '@/hooks/use-flash-toast';
import { UserSetupDialog } from '@/components/user-setup-dialog';

export default function AppLayout({
    breadcrumbs = [],
    children,
}: {
    breadcrumbs?: BreadcrumbItem[];
    children: React.ReactNode;
}) {
    useFlashToast();

    return (
        <AppLayoutTemplate breadcrumbs={breadcrumbs}>
            {children}
            <UserSetupDialog />
        </AppLayoutTemplate>
    );
}
