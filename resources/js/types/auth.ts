export type User = {
    id: number;
    name: string;
    last_name?: string | null;
    mother_last_name?: string | null;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    dni_ubigeo?: string | null;
    dni_expiration_date?: string | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
};

export type Auth = {
    user: User;
    roles?: string[];
    permissions?: string[];
};

/* @chisel-passkeys */
export type Passkey = {
    id: number;
    name: string;
    last_name?: string | null;
    mother_last_name?: string | null;
    authenticator: string | null;
    created_at_diff: string;
    last_used_at_diff: string | null;
};
/* @end-chisel-passkeys */

export type TwoFactorSetupData = {
    svg: string;
    url: string;
};

export type TwoFactorSecretKey = {
    secretKey: string;
};
