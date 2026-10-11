<?php

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use App\Actions\Fortify\ResetUserPassword;
use App\Models\User;
use App\Services\SingleDeviceSessionService;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Laravel\Fortify\Features;
use Laravel\Fortify\Fortify;

class FortifyServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureActions();
        $this->configureAuthentication();
        $this->configureViews();
        $this->configureRateLimiting();
    }

    /**
     * Configure Fortify actions.
     */
    private function configureActions(): void
    {
        Fortify::resetUserPasswordsUsing(ResetUserPassword::class);
        Fortify::createUsersUsing(CreateNewUser::class);
    }

    /**
     * Configure custom authentication pipeline with active session detection.
     */
    private function configureAuthentication(): void
    {
        Fortify::authenticateUsing(function (Request $request) {
            $dni = $request->input(Fortify::username());
            $password = $request->input('password');

            $user = User::where('dni', $dni)->first();

            if (! $user || ! Hash::check($password, $user->password)) {
                return null;
            }

            if ($user->status !== 'ACTIVE') {
                throw ValidationException::withMessages([
                    Fortify::username() => 'Tu cuenta se encuentra inactiva. Contacta con el administrador.',
                ]);
            }

            if ($user->defaultBranch && $user->defaultBranch->status !== 'ACTIVE' && ! $user->hasRole('Super Admin')) {
                throw ValidationException::withMessages([
                    Fortify::username() => 'La sucursal a la que perteneces ha sido desactivada.',
                ]);
            }

            $sessionService = app(SingleDeviceSessionService::class);
            $activeSessions = $sessionService->getActiveSessions($user, $request->session()->getId());

            // Si tiene sesión activa previa y NO ha confirmado reemplazarla, advertir estilo WhatsApp
            if ($activeSessions->isNotEmpty() && ! $request->boolean('confirm_override')) {
                $firstSession = $activeSessions->first();
                $formatted = $sessionService->formatSessionInfo($firstSession);

                throw ValidationException::withMessages([
                    'active_session_found' => [json_encode([
                        'device' => $formatted['device'],
                        'platform' => $formatted['platform'],
                        'browser' => $formatted['browser'],
                        'is_desktop' => $formatted['is_desktop'],
                        'ip_address' => $formatted['ip_address'],
                        'last_activity' => $formatted['last_activity_human'],
                        'last_activity_date' => $formatted['last_activity_date'],
                        'message' => "Ya tienes una sesión activa en {$formatted['device']} (IP: {$formatted['ip_address']}).",
                    ])],
                ]);
            }

            // Si confirmó reemplazarla o no tenía sesiones previas
            if ($activeSessions->isNotEmpty() && $request->boolean('confirm_override')) {
                $sessionService->terminateOtherSessions($user, $request);
            }

            return $user;
        });
    }

    /**
     * Configure Fortify views.
     */
    private function configureViews(): void
    {
        Fortify::loginView(function (Request $request) {
            $status = $request->session()->get('status');
            $terminatedInfo = $request->session()->get('terminated_info');

            // Fallback si la sesión flash se limpió por redirección o polling
            if (! $status) {
                $sessionCookieName = config('session.cookie');
                $cookieSessionId = $request->query('ts')
                    ?: ($request->cookie($sessionCookieName) ?: $request->cookies->get($sessionCookieName));

                if (! $cookieSessionId && $request->hasSession()) {
                    $cookieSessionId = $request->session()->getId();
                }

                if ($cookieSessionId && Cache::has("terminated_session:{$cookieSessionId}")) {
                    $terminatedData = Cache::get("terminated_session:{$cookieSessionId}");
                    if ($terminatedData && isset($terminatedData['terminated_by'])) {
                        $by = $terminatedData['terminated_by'];
                        $device = $by['device'] ?? 'Otro dispositivo';
                        $ip = $by['ip'] ?? 'Desconocida';
                        $time = $by['time'] ?? now()->format('d/m/Y h:i A');

                        $status = "Tu sesión fue cerrada automáticamente porque se inició sesión con tu cuenta desde otro dispositivo ({$device}, IP: {$ip}) el {$time}.";
                        $terminatedInfo = $by;
                    }
                }
            }

            return Inertia::render('auth/login', [
                'canResetPassword' => Features::enabled(Features::resetPasswords()),
                'status' => $status,
                'terminatedInfo' => $terminatedInfo,
            ]);
        });

        Fortify::resetPasswordView(fn (Request $request) => Inertia::render('auth/reset-password', [
            'email' => $request->email,
            'token' => $request->route('token'),
            'passwordRules' => Password::defaults()->toPasswordRulesString(),
        ]));

        Fortify::requestPasswordResetLinkView(fn (Request $request) => Inertia::render('auth/forgot-password', [
            'status' => $request->session()->get('status'),
        ]));

        Fortify::verifyEmailView(fn (Request $request) => Inertia::render('auth/verify-email', [
            'status' => $request->session()->get('status'),
        ]));

        Fortify::registerView(fn () => Inertia::render('auth/register', [
            'passwordRules' => Password::defaults()->toPasswordRulesString(),
        ]));

        Fortify::twoFactorChallengeView(fn () => Inertia::render('auth/two-factor-challenge'));

        Fortify::confirmPasswordView(fn () => Inertia::render('auth/confirm-password'));
    }

    /**
     * Configure rate limiting.
     */
    private function configureRateLimiting(): void
    {
        RateLimiter::for('two-factor', function (Request $request) {
            return Limit::perMinute(5)->by($request->session()->get('login.id'));
        });

        RateLimiter::for('login', function (Request $request) {
            $throttleKey = Str::transliterate(Str::lower($request->input(Fortify::username())).'|'.$request->ip());

            return Limit::perMinute(5)->by($throttleKey);
        });

        RateLimiter::for('passkeys', function (Request $request) {
            return Limit::perMinute(10)->by(
                ($request->input('credential.id') ?: $request->session()->getId()).'|'.$request->ip(),
            );
        });
    }
}
