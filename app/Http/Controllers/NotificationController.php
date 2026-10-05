<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * Get unread notifications for the current authenticated user with standardized payload formatting.
     */
    public function unread(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['notifications' => []]);
        }

        $notifications = $user->unreadNotifications()
            ->take(20)
            ->get()
            ->map(function ($notif) {
                return $this->formatNotification($notif);
            });

        return response()->json([
            'notifications' => $notifications,
        ]);
    }

    /**
     * Mark a single notification as read.
     */
    public function markAsRead(Request $request, string $id): JsonResponse
    {
        $notification = $request->user()->notifications()->findOrFail($id);
        $notification->markAsRead();

        return response()->json([
            'success' => true,
            'message' => 'Notificación marcada como leída.',
        ]);
    }

    /**
     * Mark all unread notifications of the user as read.
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications->markAsRead();

        return response()->json([
            'success' => true,
            'message' => 'Todas las notificaciones han sido marcadas como leídas.',
        ]);
    }

    /**
     * Formats notification object ensuring backward compatibility and standard fields.
     */
    protected function formatNotification($notification): array
    {
        $data = $notification->data ?? [];

        // Determinar título por defecto si no existe
        $title = $data['title'] ?? match ($data['category'] ?? null) {
            'transfers' => 'Traslado de Mercadería',
            'sales' => 'Cobranza / Venta',
            'inventory' => 'Inventario',
            'closings' => 'Cierre Diario',
            default => 'Notificación del Sistema',
        };

        // Fallback de URL de acción
        $actionUrl = $data['action_url'] ?? null;
        if (! $actionUrl && ! empty($data['transfer_id'])) {
            $actionUrl = "/transfers/{$data['transfer_id']}";
        }

        // Categoría y severidad
        $category = $data['category'] ?? ($data['transfer_id'] ?? null ? 'transfers' : 'system');
        $severity = $data['severity'] ?? 'info';

        return [
            'id' => $notification->id,
            'type' => $notification->type,
            'created_at' => $notification->created_at?->toISOString() ?? now()->toISOString(),
            'read_at' => $notification->read_at?->toISOString() ?? null,
            'data' => array_merge($data, [
                'title' => $title,
                'message' => $data['message'] ?? 'Tienes una nueva actualización en el sistema.',
                'action_url' => $actionUrl,
                'category' => $category,
                'severity' => $severity,
            ]),
        ];
    }
}
