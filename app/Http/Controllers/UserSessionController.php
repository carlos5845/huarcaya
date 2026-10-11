<?php

namespace App\Http\Controllers;

use App\Models\LoginHistory;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Jenssegers\Agent\Agent;

class UserSessionController extends Controller
{
    public function index(Request $request, User $user)
    {
        $lifetimeMinutes = (int) config('session.lifetime', 120);
        $thresholdTimestamp = now()->subMinutes($lifetimeMinutes)->getTimestamp();

        $activeSessionsDb = DB::table('sessions')
            ->where('user_id', $user->id)
            ->where('last_activity', '>=', $thresholdTimestamp)
            ->get()
            ->keyBy('id');

        $activeSessionIds = $activeSessionsDb->keys()->toArray();
        $currentSessionId = $request->session()->getId();

        $sessions = LoginHistory::where('user_id', $user->id)
            ->orderBy('login_at', 'desc')
            ->get()
            ->map(function ($history) use ($activeSessionIds, $activeSessionsDb, $currentSessionId) {
                $agent = tap(new Agent, function ($a) use ($history) {
                    $a->setUserAgent($history->user_agent);
                });

                $isActive = in_array($history->session_id, $activeSessionIds) && is_null($history->logout_at);
                $isCurrent = $isActive && ($history->session_id === $currentSessionId);

                // Calcular duración o tiempo de actividad
                $loginCarbon = $history->login_at;
                $logoutCarbon = $history->logout_at;

                $durationHuman = null;
                if ($logoutCarbon) {
                    $durationHuman = $loginCarbon->diffForHumans($logoutCarbon, true);
                } elseif ($isActive) {
                    $sessionDb = $activeSessionsDb->get($history->session_id);
                    if ($sessionDb && isset($sessionDb->last_activity)) {
                        $lastActivityCarbon = Carbon::createFromTimestamp($sessionDb->last_activity);
                        $durationHuman = 'Activo hace '.$lastActivityCarbon->diffForHumans();
                    } else {
                        $durationHuman = 'Conectado hace '.$loginCarbon->diffForHumans();
                    }
                }

                return [
                    'id' => $history->id,
                    'session_id' => $history->session_id,
                    'ip_address' => $history->ip_address,
                    'is_current_device' => $isCurrent,
                    'is_active' => $isActive,
                    'agent' => [
                        'is_desktop' => $agent->isDesktop(),
                        'is_mobile' => $agent->isMobile(),
                        'is_tablet' => $agent->isTablet(),
                        'platform' => $agent->platform() ?: 'Desconocido',
                        'browser' => $agent->browser() ?: 'Desconocido',
                        'raw' => $history->user_agent,
                    ],
                    'login_at' => $history->login_at->format('d/m/Y h:i A'),
                    'login_at_human' => $history->login_at->diffForHumans(),
                    'logout_at' => $history->logout_at ? $history->logout_at->format('d/m/Y h:i A') : null,
                    'duration' => $durationHuman,
                ];
            });

        // Métricas agregadas
        $totalSessions = $sessions->count();
        $activeCount = $sessions->where('is_active', true)->count();
        $desktopCount = $sessions->where('agent.is_desktop', true)->count();
        $mobileCount = $sessions->where('agent.is_desktop', false)->count();
        $lastLogin = $sessions->first();

        return Inertia::render('users/sessions', [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'dni' => $user->dni,
                'email' => $user->email,
            ],
            'sessions' => $sessions->values(),
            'metrics' => [
                'total' => $totalSessions,
                'active' => $activeCount,
                'desktop' => $desktopCount,
                'mobile' => $mobileCount,
                'last_login' => $lastLogin ? $lastLogin['login_at_human'] : 'Sin registros',
            ],
        ]);
    }

    public function destroy(Request $request, User $user, $sessionId)
    {
        // Obtener datos del admin o quien cierra la sesión
        $admin = Auth::user();
        $adminName = $admin ? $admin->name : 'un administrador';

        // 1. Guardar flag en Cache para que el usuario expulsado reciba el aviso explicativo
        Cache::put("terminated_session:{$sessionId}", [
            'user_id' => $user->id,
            'terminated_by' => [
                'device' => "Panel de Administración ({$adminName})",
                'is_desktop' => true,
                'ip' => $request->ip() ?: 'Desconocida',
                'time' => now()->format('d/m/Y h:i A'),
            ],
        ], now()->addHours(24));

        // 2. Eliminar de la tabla sessions
        DB::table('sessions')
            ->where('user_id', $user->id)
            ->where('id', $sessionId)
            ->delete();

        // 3. Actualizar LoginHistory con la fecha de salida
        LoginHistory::where('user_id', $user->id)
            ->where('session_id', $sessionId)
            ->whereNull('logout_at')
            ->update(['logout_at' => now()]);

        return back()->with('success', 'Sesión cerrada exitosamente y usuario desconectado.');
    }
}
