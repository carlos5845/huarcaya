import type { ImgHTMLAttributes } from 'react';

export default function AppLogoIcon(props: ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <>
            <img {...props} src="/logo-huarcaya.webp" alt="Logo" className={`${props.className || ''} block dark:hidden`} />
            <img {...props} src="/logo-dark.png" alt="Logo" className={`${props.className || ''} hidden dark:block`} />
        </>
    );
}
