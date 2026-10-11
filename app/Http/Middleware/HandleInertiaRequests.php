<?php

namespace App\Http\Middleware;

use App\Models\Conflict;
use App\Models\Setting;
use App\Models\SettingValue;
use App\Services\AlertService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $request->user(),
                'roles' => $request->user() ? $request->user()->getRoleNames() : [],
                'permissions' => $request->user() ? $request->user()->getAllPermissions()->pluck('name') : [],
                'requires_setup' => $request->user() ? (
                    $request->user()->must_change_password ||
                    empty($request->user()->dni_ubigeo) ||
                    empty($request->user()->dni_expiration_date)
                ) : false,
            ],
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
                'status' => function () use ($request) {
                    if ($status = $request->session()->get('status')) {
                        return $status;
                    }

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

                            return "Tu sesión fue cerrada automáticamente porque se inició sesión con tu cuenta desde otro dispositivo ({$device}, IP: {$ip}) el {$time}.";
                        }
                    }

                    return null;
                },
                'terminated_info' => function () use ($request) {
                    if ($info = $request->session()->get('terminated_info')) {
                        return $info;
                    }

                    $sessionCookieName = config('session.cookie');
                    $cookieSessionId = $request->query('ts')
                        ?: ($request->cookie($sessionCookieName) ?: $request->cookies->get($sessionCookieName));

                    if (! $cookieSessionId && $request->hasSession()) {
                        $cookieSessionId = $request->session()->getId();
                    }

                    if ($cookieSessionId && Cache::has("terminated_session:{$cookieSessionId}")) {
                        $terminatedData = Cache::get("terminated_session:{$cookieSessionId}");

                        return $terminatedData['terminated_by'] ?? null;
                    }

                    return null;
                },
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'company_settings' => function () use ($request) {
                if (! $request->user()) {
                    return [];
                }

                $exchangeRate = '3.80';
                $setting = Setting::where('key', 'exchange_rate')->first();
                if ($setting) {
                    $val = SettingValue::where('company_id', $request->user()->company_id)
                        ->where('setting_id', $setting->id)
                        ->first();
                    $exchangeRate = $val ? $val->value : $setting->default_value;
                }

                return [
                    'exchange_rate' => $exchangeRate,
                ];
            },
            'pending_conflicts_count' => function () use ($request) {
                $user = $request->user();
                if (! $user) {
                    return 0;
                }

                if ($user->hasRole('Super Admin')) {
                    return Conflict::pending()->count();
                }

                $allowedBranchIds = $user->branches()->where('branches.status', 'ACTIVE')->pluck('branches.id')->toArray();
                if (empty($allowedBranchIds) && $user->default_branch_id) {
                    $allowedBranchIds = [$user->default_branch_id];
                }

                if (empty($allowedBranchIds)) {
                    return 0;
                }

                $allowedBranchValues = array_unique(array_merge(
                    array_map('intval', $allowedBranchIds),
                    array_map('strval', $allowedBranchIds)
                ));

                return Conflict::pending()->where(function ($q) use ($allowedBranchValues, $allowedBranchIds) {
                    $q->whereIn('client_state->branch_id', $allowedBranchValues)
                        ->orWhereHas('syncOperation.device', function ($dq) use ($allowedBranchIds) {
                            $dq->whereIn('branch_id', $allowedBranchIds);
                        });
                })->count();
            },
            'active_alerts_count' => function () use ($request) {
                $user = $request->user();
                if (! $user) {
                    return 0;
                }

                return app(AlertService::class)->getUnreadCountForUser($user);
            },
        ];
    }
}
