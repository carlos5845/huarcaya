import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, ChevronRight } from 'lucide-react';

type PageProps = {
    auth: {
        user?: {
            name?: string;
            email?: string;
        } | null;
    };
};

export default function Welcome() {
    const { auth } = usePage<PageProps>().props;

    return (
        <>
            <Head title="SIMAQ" />

            <div className="min-h-screen overflow-x-hidden bg-black-haze-50 text-bunker-900">
                {/* Header con efecto glassmorphism */}
                <header className="absolute inset-x-0 top-0 z-40 bg-transparent">
                    <div className="mx-auto flex h-[84px] w-full max-w-7xl items-center justify-between px-6 lg:px-8">
                        <Link
                            href="/"
                            className="flex items-center gap-3"
                            aria-label="Ir al inicio"
                        >
                            <span className="flex size-25 items-center justify-center">
                                <img
                                    src="/logo-text.png"
                                    alt="SIMAQ"
                                    className="h-full w-full object-contain"
                                    onError={(event) => {
                                        event.currentTarget.style.display =
                                            'none';

                                        if (event.currentTarget.parentElement) {
                                            event.currentTarget.parentElement.textContent =
                                                'S';

                                            event.currentTarget.parentElement.classList.add(
                                                'text-lg',
                                                'font-black',
                                                'text-white',
                                            );
                                        }
                                    }}
                                />
                            </span>
                        </Link>

                        {auth?.user ? (
                            <Link
                                href="/dashboard"
                                className="rounded-full border border-white/20 bg-midnight-950/95 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(4,22,46,0.22)] transition hover:-translate-y-0.5 hover:bg-midnight-900 hover:shadow-[0_12px_28px_rgba(4,22,46,0.28)]"
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <Link
                                href="/login"
                                className="rounded-md border border-white/20 bg-midnight-950/95 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(4,22,46,0.22)] transition hover:-translate-y-0.5 hover:bg-midnight-900 hover:shadow-[0_12px_28px_rgba(4,22,46,0.28)]"
                            >
                                Iniciar sesión
                            </Link>
                        )}
                    </div>
                </header>

                <main>
                    <section className="relative isolate min-h-[900px] overflow-hidden pt-[84px]">
                        {/* Imagen industrial */}
                        <div className="absolute inset-0 -z-30 overflow-hidden">
                            <img
                                src="/images/hero-maquinaria.jpg"
                                alt=""
                                aria-hidden="true"
                                className="h-full w-full scale-100 object-cover object-[center_8%] sm:object-[center_5%] lg:object-[center_2%]"
                            />
                        </div>

                        {/* Oscurece mínimamente toda la foto */}
                        <div className="pointer-events-none absolute inset-0 -z-20 bg-midnight-950/10" />

                        {/* Centro más claro; laterales más visibles */}
                        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.70)_0%,rgba(255,255,255,0.45)_26%,rgba(255,255,255,0.12)_52%,rgba(255,255,255,0)_76%)]" />

                        {/* Suavizado superior muy leve */}
                        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[42%] bg-gradient-to-b from-white/18 via-white/5 to-transparent" />

                        {/* Blanco inferior: integración con dashboard */}
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[42%] bg-gradient-to-t from-white via-white/70 to-transparent" />

                        <div className="relative mx-auto flex w-full max-w-7xl flex-col items-center px-6 pt-12 text-center sm:pt-2 lg:px-8 lg:pt-2">
                            {/* Tu badge, título, descripción, botón y DashboardMockup */}
                        </div>
                        {/* Fusión clara con la zona donde comienza el mockup */}
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[44%] bg-gradient-to-t from-white via-white/78 to-transparent" />

                        <div className="relative mx-auto flex w-full max-w-7xl flex-col items-center px-6 pt-2 text-center sm:pt-2 lg:px-8 lg:pt-2">
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/50 px-3.5 py-2 text-[11px] font-medium text-midnight-800 shadow-[0_5px_18px_rgba(4,22,46,0.10)] backdrop-blur-md">
                                <span className="size-1.5 rounded-full bg-cannon-black-500" />

                                <span>Plataforma de gestión de repuestos</span>

                                <ChevronRight className="size-3 text-midnight-600" />
                            </div>

                            <h1 className="mt-7 max-w-5xl text-5xl leading-[0.98] font-bold tracking-[-0.06em] text-midnight-950 drop-shadow-[0_3px_16px_rgba(255,255,255,0.92)] sm:text-6xl lg:text-[78px]">
                                Una solución integral para
                                <br />
                                <span className="bg-gradient-to-r from-midnight-700 via-fun-blue-600 to-midnight-700 bg-clip-text text-transparent">
                                    toda tu operación
                                </span>
                            </h1>

                            <p className="mt-7 max-w-2xl  px-5 py-3 text-base leading-7 text-black-haze-800  sm:text-lg">
                                SIMAQ es un sistema de inventario de maquinaria
                                que te ayuda a administrar productos, compras,
                                ventas, usuarios y sucursales desde un solo
                                lugar.
                            </p>

                            <div className="mt-8 flex items-center justify-center gap-6">
                                {auth?.user ? (
                                    <Link
                                        href="/dashboard"
                                        className="group inline-flex items-center gap-2 rounded-full border border-white/20 bg-midnight-950 px-5 py-3 text-xs font-semibold text-white shadow-[0_10px_24px_rgba(4,22,46,0.24)] transition hover:-translate-y-0.5 hover:bg-midnight-900 hover:shadow-[0_14px_30px_rgba(4,22,46,0.30)]"
                                    >
                                        Ir al dashboard
                                        <ArrowRight className="size-3.5 transition group-hover:translate-x-1" />
                                    </Link>
                                ) : (
                                    <Link
                                        href="/login"
                                        className="group inline-flex items-center gap-2 rounded-md border border-white/20 bg-midnight-950 px-5 py-3 text-xs font-semibold text-white shadow-[0_10px_24px_rgba(4,22,46,0.24)] transition hover:-translate-y-0.5 hover:bg-midnight-900 hover:shadow-[0_14px_30px_rgba(4,22,46,0.30)]"
                                    >
                                        Iniciar sesión
                                        <ArrowRight className="size-3.5 transition group-hover:translate-x-1" />
                                    </Link>
                                )}
                            </div>

                            <DashboardMockup />
                        </div>
                    </section>

                    <section
                        id="caracteristicas"
                        className="relative mx-auto grid w-full max-w-7xl gap-5 px-6 py-24 sm:grid-cols-3 lg:px-8"
                    >
                        <FeatureCard
                            number="01"
                            title="Inventario centralizado"
                            description="Controla el stock y consulta la información de tus productos rápidamente."
                        />

                        <FeatureCard
                            number="02"
                            title="Métricas operativas"
                            description="Visualiza los indicadores principales de tu operación en un solo panel."
                        />

                        <FeatureCard
                            number="03"
                            title="Gestión organizada"
                            description="Administra sucursales, compras, ventas, clientes y proveedores."
                        />
                    </section>
                </main>

                <footer
                    id="contacto"
                    className="border-t border-black-haze-200 bg-white/60 px-6 py-8 lg:px-8"
                >
                    <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 text-sm text-black-haze-700 sm:flex-row">
                        <span>
                            © 2026 SIMAQ. Todos los derechos reservados.
                        </span>

                        <span>Sistema de inventario de maquinaria</span>
                    </div>
                </footer>
            </div>
        </>
    );
}

function DashboardMockup() {
    return (
        <div
            id="vista-previa"
            className="relative mt-16 w-full max-w-[1140px] overflow-hidden rounded-[1.5rem] border border-black-haze-300 bg-white p-2 shadow-[0_28px_70px_rgba(4,22,46,0.16),0_0_0_1px_rgba(255,255,255,0.8)] sm:mt-20 sm:p-3"
        >
            <div className="overflow-hidden rounded-[1rem] border border-black-haze-200 bg-white">
                <BrowserHeader />

                <div className="relative bg-white">
                    <img
                        src="/images/dashboard-preview.png"
                        alt="Vista previa del dashboard de SIMAQ"
                        className="block h-auto w-full"
                    />

                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[24%] bg-gradient-to-t from-white via-white/70 to-transparent" />
                </div>
            </div>
        </div>
    );
}

function BrowserHeader() {
    return (
        <div className="flex h-11 items-center gap-2 border-b border-black-haze-200 bg-black-haze-50 px-4 sm:h-12 sm:px-5">
            <span className="size-2.5 rounded-full bg-red-400 sm:size-3" />
            <span className="size-2.5 rounded-full bg-cannon-black-400 sm:size-3" />
            <span className="size-2.5 rounded-full bg-fun-blue-400 sm:size-3" />

            <div className="mx-auto hidden w-[42%] rounded-md border border-black-haze-200 bg-white px-3 py-1.5 text-left text-[9px] text-black-haze-500 sm:block">
                simaq.app/dashboard
            </div>

            <div className="ml-auto size-5 rounded-full bg-black-haze-200" />
        </div>
    );
}

function FeatureCard({
                         number,
                         title,
                         description,
                     }: {
    number: string;
    title: string;
    description: string;
}) {
    return (
        <article className="rounded-2xl border border-black-haze-200 bg-white p-6 shadow-[0_3px_10px_rgba(4,22,46,0.04)] transition hover:-translate-y-1 hover:border-midnight-300 hover:shadow-[0_14px_30px_rgba(4,22,46,0.1)]">
            <span className="text-xs font-semibold tracking-[0.2em] text-midnight-700">
                {number}
            </span>

            <h3 className="mt-5 text-base font-semibold text-midnight-950">
                {title}
            </h3>

            <p className="mt-2 text-sm leading-6 text-black-haze-700">
                {description}
            </p>
        </article>
    );
}
