<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class UserSetupController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'dni_ubigeo' => ['required', 'string', 'size:6'],
            'dni_expiration_date' => ['required', 'date'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        $user = $request->user();

        $user->update([
            'dni_ubigeo' => $validated['dni_ubigeo'],
            'dni_expiration_date' => $validated['dni_expiration_date'],
            'password' => Hash::make($validated['password']),
            'must_change_password' => false,
        ]);

        return back()->with('success', 'Perfil configurado exitosamente.');
    }
}
