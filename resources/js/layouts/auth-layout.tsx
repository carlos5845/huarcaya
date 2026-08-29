import { useFlashToast } from '@/hooks/use-flash-toast';
import AuthLayoutTemplate from '@/layouts/auth/auth-split-layout';

export default function AuthLayout({
    title = '',
    description = '',
    showBackArrow = false,
    children,
}: {
    title?: string;
    description?: string;
    showBackArrow?: boolean;
    children: React.ReactNode;
}) {
    useFlashToast();

    return (
        <AuthLayoutTemplate title={title} description={description} showBackArrow={showBackArrow}>
            {children}
        </AuthLayoutTemplate>
    );
}
