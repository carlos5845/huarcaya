<?php

use App\Http\Middleware\CheckTerminatedSession;
use App\Models\Branch;
use App\Models\Company;
use App\Models\LoginHistory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);

    $this->company = Company::create([
        'uuid' => (string) Str::uuid(),
        'name' => 'Inversiones Huarcaya',
        'business_name' => 'INVERSIONES HUARCAYA S.A.C.',
        'document_type' => 'RUC',
        'document_number' => '20601234567',
    ]);

    $this->branch = Branch::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'name' => 'Sucursal Principal',
        'code' => 'SUC-01',
        'address' => 'Av. Industrial 100',
        'status' => 'ACTIVE',
    ]);

    $this->user = User::factory()->create([
        'company_id' => $this->company->id,
        'default_branch_id' => $this->branch->id,
        'dni' => '12345678',
        'password' => Hash::make('Secret1234*!'),
        'status' => 'ACTIVE',
    ]);
    $this->user->assignRole('Super Admin');
});

test('usuario sin sesion previa inicia sesion directamente', function () {
    $response = $this->post('/login', [
        'dni' => '12345678',
        'password' => 'Secret1234*!',
    ]);

    $response->assertSessionHasNoErrors();
    $this->assertAuthenticatedAs($this->user);
});

test('usuario con sesion activa en otro equipo recibe advertencia tipo whatsapp si no confirma override', function () {
    // 1. Simular sesión activa previa en PC de Oficina (Windows - Chrome)
    $oldSessionId = Str::random(40);
    DB::table('sessions')->insert([
        'id' => $oldSessionId,
        'user_id' => $this->user->id,
        'ip_address' => '192.168.1.15',
        'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'payload' => serialize(['user_id' => $this->user->id]),
        'last_activity' => now()->timestamp,
    ]);

    LoginHistory::create([
        'user_id' => $this->user->id,
        'session_id' => $oldSessionId,
        'ip_address' => '192.168.1.15',
        'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'login_at' => now()->subMinutes(10),
    ]);

    // 2. Intentar login desde otro dispositivo sin confirmar override
    $response = $this->withServerVariables(['REMOTE_ADDR' => '192.168.1.25'])
        ->withHeaders(['User-Agent' => 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'])
        ->post('/login', [
            'dni' => '12345678',
            'password' => 'Secret1234*!',
            'confirm_override' => false,
        ]);

    $response->assertSessionHasErrors(['active_session_found']);
    $this->assertGuest();

    // La sesión anterior debe seguir viva en sessions
    $this->assertDatabaseHas('sessions', [
        'id' => $oldSessionId,
        'user_id' => $this->user->id,
    ]);
});

test('usuario con sesion activa que confirma override cierra la anterior y registra aviso', function () {
    // 1. Crear sesión activa en PC
    $oldSessionId = Str::random(40);
    DB::table('sessions')->insert([
        'id' => $oldSessionId,
        'user_id' => $this->user->id,
        'ip_address' => '192.168.1.15',
        'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'payload' => serialize(['user_id' => $this->user->id]),
        'last_activity' => now()->timestamp,
    ]);

    $history = LoginHistory::create([
        'user_id' => $this->user->id,
        'session_id' => $oldSessionId,
        'ip_address' => '192.168.1.15',
        'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'login_at' => now()->subMinutes(10),
    ]);

    // 2. Login confirmando override desde Android
    $response = $this->withServerVariables(['REMOTE_ADDR' => '192.168.1.25'])
        ->withHeaders(['User-Agent' => 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'])
        ->post('/login', [
            'dni' => '12345678',
            'password' => 'Secret1234*!',
            'confirm_override' => true,
        ]);

    $response->assertSessionHasNoErrors();
    $this->assertAuthenticatedAs($this->user);

    // 3. La sesión vieja debe haber sido eliminada de 'sessions'
    $this->assertDatabaseMissing('sessions', [
        'id' => $oldSessionId,
    ]);

    // 4. El LoginHistory de la sesión vieja debe tener logout_at
    $history->refresh();
    expect($history->logout_at)->not->toBeNull();

    // 5. Debe existir la clave en caché para alertar a la sesión vieja
    expect(Cache::has("terminated_session:{$oldSessionId}"))->toBeTrue();
    $terminatedData = Cache::get("terminated_session:{$oldSessionId}");
    expect($terminatedData['terminated_by']['ip'])->toBe('192.168.1.25');
});

test('middleware CheckTerminatedSession detecta sesion terminada y redirige al login con aviso', function () {
    $oldSessionId = Str::random(40);
    Cache::put("terminated_session:{$oldSessionId}", [
        'user_id' => $this->user->id,
        'terminated_by' => [
            'device' => 'Android - Chrome',
            'is_desktop' => false,
            'ip' => '192.168.1.50',
            'time' => '11/10/2026 12:00 PM',
        ],
    ], now()->addHours(24));

    $request = Request::create('/dashboard', 'GET');
    $request->cookies->set(config('session.cookie'), $oldSessionId);
    $request->setLaravelSession(session()->driver());

    $middleware = new CheckTerminatedSession;
    $response = $middleware->handle($request, function () {
        return response('ok');
    });

    expect($response->isRedirection())->toBeTrue();
    expect($response->getTargetUrl())->toContain(route('login'));
    expect(session('session_terminated'))->toBeTrue();
    expect(session('status'))->toContain('Android - Chrome');
    expect(session('status'))->toContain('192.168.1.50');
});

test('middleware CheckTerminatedSession responde redireccion para solicitudes X-Inertia', function () {
    $oldSessionId = Str::random(40);
    Cache::put("terminated_session:{$oldSessionId}", [
        'user_id' => $this->user->id,
        'terminated_by' => [
            'device' => 'iPhone - Safari',
            'is_desktop' => false,
            'ip' => '192.168.1.80',
            'time' => '11/10/2026 01:00 PM',
        ],
    ], now()->addHours(24));

    $request = Request::create('/inventory', 'GET');
    $request->headers->set('X-Inertia', 'true');
    $request->cookies->set(config('session.cookie'), $oldSessionId);
    $request->setLaravelSession(session()->driver());

    $middleware = new CheckTerminatedSession;
    $response = $middleware->handle($request, function () {
        return response('ok');
    });

    expect($response->isRedirection() || $response->getStatusCode() === 409)->toBeTrue();
    expect($response->getTargetUrl() ?: $response->headers->get('X-Inertia-Location'))->toContain(route('login'));
});

test('loginView de Fortify provee status con datos de dispositivo desconectado aunque se use ts query param', function () {
    $oldSessionId = Str::random(40);
    Cache::put("terminated_session:{$oldSessionId}", [
        'user_id' => $this->user->id,
        'terminated_by' => [
            'device' => 'Linux - Firefox',
            'is_desktop' => true,
            'ip' => '192.168.1.99',
            'time' => '11/10/2026 02:00 PM',
        ],
    ], now()->addHours(24));

    $response = $this->get("/login?reason=session_terminated&ts={$oldSessionId}");

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('auth/login')
        ->where('flash.status', fn ($val) => str_contains($val, 'Linux - Firefox') && str_contains($val, '192.168.1.99'))
    );
});

test('dispositivo con sesion previa terminada puede consultar check-dni e iniciar sesion de nuevo sin bloqueo', function () {
    $oldSessionId = Str::random(40);
    Cache::put("terminated_session:{$oldSessionId}", [
        'user_id' => $this->user->id,
        'terminated_by' => [
            'device' => 'Windows - Chrome',
            'is_desktop' => true,
            'ip' => '192.168.1.200',
            'time' => '11/10/2026 03:00 PM',
        ],
    ], now()->addHours(24));

    // 1. Simular la petición POST /auth/check-dni con la cookie de la sesión terminada
    $checkResponse = $this->withUnencryptedCookie(config('session.cookie'), $oldSessionId)
        ->postJson('/auth/check-dni', [
            'dni' => '12345678',
        ]);

    $checkResponse->assertOk();
    $checkResponse->assertJsonPath('data.name', $this->user->name);

    // 2. Simular el login nuevo
    $loginResponse = $this->withUnencryptedCookie(config('session.cookie'), $oldSessionId)
        ->post('/login', [
            'dni' => '12345678',
            'password' => 'Secret1234*!',
            'confirm_override' => true,
        ]);

    $loginResponse->assertSessionHasNoErrors();
    $this->assertAuthenticatedAs($this->user);
});
