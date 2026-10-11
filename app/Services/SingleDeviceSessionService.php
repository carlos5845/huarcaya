<?php

namespace App\Services;

use App\Models\LoginHistory;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Jenssegers\Agent\Agent;

class SingleDeviceSessionService
{
    /**
     * Obtiene las sesiones activas en la base de datos para un usuario específico,
     * excluyendo opcionalmente el ID de sesión actual.
     */
    public function getActiveSessions(User $user, ?string $currentSessionId = null): Collection
    {
        $lifetimeMinutes = (int) config('session.lifetime', 120);
        $thresholdTimestamp = now()->subMinutes($lifetimeMinutes)->getTimestamp();

        $query = DB::table('sessions')
            ->where('user_id', $user->id)
            ->where('last_activity', '>=', $thresholdTimestamp);

        if ($currentSessionId) {
            $query->where('id', '!=', $currentSessionId);
        }

        return $query->orderBy('last_activity', 'desc')->get();
    }

    /**
     * Da formato legible y amigable a los datos de una sesión (SO, navegador, IP, actividad).
     */
    public function formatSessionInfo(object $session): array
    {
        $agent = tap(new Agent, function ($a) use ($session) {
            $a->setUserAgent($session->user_agent);
        });

        $platform = $agent->platform() ?: 'Dispositivo';
        $browser = $agent->browser() ?: 'Navegador';
        $device = "{$platform} - {$browser}";

        $lastActivityCarbon = Carbon::createFromTimestamp($session->last_activity);

        return [
            'id' => $session->id,
            'device' => $device,
            'platform' => $platform,
            'browser' => $browser,
            'is_desktop' => $agent->isDesktop(),
            'ip_address' => $session->ip_address ?: 'Desconocida',
            'last_activity_human' => $lastActivityCarbon->diffForHumans(),
            'last_activity_date' => $lastActivityCarbon->format('d/m/Y h:i A'),
        ];
    }

    /**
     * Termina limpiamente las otras sesiones de un usuario:
     * 1. Almacena en Cache la información del nuevo dispositivo para alertar a la sesión saliente.
     * 2. Actualiza el historial en login_histories con la hora de cierre.
     * 3. Elimina los registros de la tabla 'sessions'.
     */
    public function terminateOtherSessions(User $user, Request $request): void
    {
        $activeSessions = $this->getActiveSessions($user, $request->session()->getId());

        if ($activeSessions->isEmpty()) {
            return;
        }

        $incomingAgent = tap(new Agent, function ($a) use ($request) {
            $a->setUserAgent($request->userAgent());
        });
        $newPlatform = $incomingAgent->platform() ?: 'Dispositivo';
        $newBrowser = $incomingAgent->browser() ?: 'Navegador';
        $incomingDevice = "{$newPlatform} - {$newBrowser}";
        $incomingIp = $request->ip() ?: 'Desconocida';
        $terminatedTime = now()->format('d/m/Y h:i A');

        foreach ($activeSessions as $oldSession) {
            // Guardar flag de terminación para la sesión saliente (duración 24 horas)
            Cache::put("terminated_session:{$oldSession->id}", [
                'user_id' => $user->id,
                'terminated_by' => [
                    'device' => $incomingDevice,
                    'is_desktop' => $incomingAgent->isDesktop(),
                    'ip' => $incomingIp,
                    'time' => $terminatedTime,
                ],
            ], now()->addHours(24));

            // Actualizar LoginHistory
            LoginHistory::where('session_id', $oldSession->id)
                ->whereNull('logout_at')
                ->update(['logout_at' => now()]);

            // Eliminar de sessions
            DB::table('sessions')->where('id', $oldSession->id)->delete();
        }
    }
}
