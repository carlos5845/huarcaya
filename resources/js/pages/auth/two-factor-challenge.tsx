import { Head } from '@inertiajs/react';

export default function TwoFactorChallenge() {
    return (
        <>
            <Head title="Autenticación de dos factores deshabilitada" />
            <div className="text-center text-sm text-muted-foreground">
                La autenticación de dos factores se encuentra deshabilitada.
            </div>
        </>
    );
}
