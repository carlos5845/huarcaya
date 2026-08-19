<?php

namespace App\Listeners;

use App\Models\LoginHistory;
use Illuminate\Auth\Events\Logout;

class LogSuccessfulLogout
{
    /**
     * Create the event listener.
     */
    public function __construct()
    {
        //
    }

    /**
     * Handle the event.
     */
    public function handle(Logout $event): void
    {
        $user = $event->user;

        if ($user) {
            LoginHistory::where('user_id', $user->getAuthIdentifier())
                ->where('session_id', request()->session()->getId())
                ->update(['logout_at' => now()]);
        }
    }
}
