<?php

use App\Models\Branch;
use App\Models\Company;
use App\Models\Customer;
use App\Models\DailyClosing;
use App\Models\Payment;
use App\Models\Receivable;
use App\Models\Sale;
use App\Models\Transfer;
use App\Models\User;
use App\Notifications\DailyClosingDiscrepancyNotification;
use App\Notifications\PaymentReceivedNotification;
use App\Notifications\TransferRequestedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
    ]);

    $this->branch2 = Branch::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'name' => 'Sucursal Norte',
        'code' => 'SUC-02',
    ]);

    $this->user = User::factory()->create([
        'company_id' => $this->company->id,
        'default_branch_id' => $this->branch->id,
        'status' => 'ACTIVE',
    ]);
    $this->user->assignRole('Super Admin');
});

test('it returns unread notifications with standardized payload', function () {
    $transfer = Transfer::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'source_branch_id' => $this->branch->id,
        'destination_branch_id' => $this->branch2->id,
        'transfer_number' => 'TRF-001',
        'request_date' => now(),
        'status' => 'REQUESTED',
        'created_by' => $this->user->id,
    ]);

    $this->user->notify(new TransferRequestedNotification($transfer, 'request'));

    $response = $this->actingAs($this->user)->getJson('/api/notifications/unread');

    $response->assertStatus(200);
    $response->assertJsonStructure([
        'notifications' => [
            '*' => [
                'id',
                'type',
                'created_at',
                'read_at',
                'data' => [
                    'title',
                    'message',
                    'action_url',
                    'category',
                    'severity',
                ],
            ],
        ],
    ]);

    $data = $response->json('notifications.0.data');
    expect($data['category'])->toBe('transfers');
    expect($data['action_url'])->toBe("/transfers/{$transfer->id}");
    expect($data['title'])->toBe('Solicitud de Traslado');
});

test('it marks a single notification as read', function () {
    $transfer = Transfer::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'source_branch_id' => $this->branch->id,
        'destination_branch_id' => $this->branch2->id,
        'transfer_number' => 'TRF-002',
        'request_date' => now(),
        'status' => 'SHIPPED',
        'created_by' => $this->user->id,
    ]);

    $this->user->notify(new TransferRequestedNotification($transfer, 'shipped'));

    expect($this->user->unreadNotifications()->count())->toBe(1);

    $notifId = $this->user->unreadNotifications()->first()->id;

    $response = $this->actingAs($this->user)->postJson("/api/notifications/{$notifId}/read");

    $response->assertStatus(200);
    $response->assertJson(['success' => true]);
    expect($this->user->fresh()->unreadNotifications()->count())->toBe(0);
});

test('it marks all notifications as read', function () {
    $transfer1 = Transfer::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'source_branch_id' => $this->branch->id,
        'destination_branch_id' => $this->branch2->id,
        'transfer_number' => 'TRF-003',
        'request_date' => now(),
        'status' => 'REQUESTED',
        'created_by' => $this->user->id,
    ]);
    $transfer2 = Transfer::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'source_branch_id' => $this->branch->id,
        'destination_branch_id' => $this->branch2->id,
        'transfer_number' => 'TRF-004',
        'request_date' => now(),
        'status' => 'RECEIVED',
        'created_by' => $this->user->id,
    ]);

    $this->user->notify(new TransferRequestedNotification($transfer1, 'request'));
    $this->user->notify(new TransferRequestedNotification($transfer2, 'received'));

    expect($this->user->unreadNotifications()->count())->toBe(2);

    $response = $this->actingAs($this->user)->postJson('/api/notifications/read-all');

    $response->assertStatus(200);
    $response->assertJson(['success' => true]);
    expect($this->user->fresh()->unreadNotifications()->count())->toBe(0);
});

test('payment notification is structured with sales category and proper details', function () {
    $customer = Customer::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'legal_name' => 'Transportes SAC',
        'document_type' => 'RUC',
        'document_number' => '20123456789',
    ]);

    $sale = Sale::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'branch_id' => $this->branch->id,
        'customer_id' => $customer->id,
        'sale_number' => 'B001-0001',
        'customer_name_snapshot' => 'Transportes SAC',
        'sale_type' => 'DIRECTA',
        'operation_type' => 'GRAVADA',
        'operation_date' => now(),
        'payment_type' => 'CREDIT',
        'subtotal_amount' => 423.73,
        'tax_amount' => 76.27,
        'discount_amount' => 0.0,
        'total_amount' => 500.00,
        'paid_amount' => 300.00,
        'currency_code' => 'PEN',
        'status' => 'CONFIRMED',
        'payment_status' => 'PARTIAL',
        'created_by' => $this->user->id,
    ]);

    $receivable = Receivable::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'branch_id' => $this->branch->id,
        'customer_id' => $customer->id,
        'sale_id' => $sale->id,
        'issue_date' => now(),
        'due_date' => now()->addDays(15),
        'currency_code' => 'PEN',
        'original_amount' => 500,
        'balance_amount' => 200,
        'status' => 'ACTIVE',
    ]);

    $payment = Payment::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'branch_id' => $this->branch->id,
        'customer_id' => $customer->id,
        'payment_number' => 'PAY-001',
        'operation_date' => now()->toDateString(),
        'total_amount' => 300,
        'currency_code' => 'PEN',
        'status' => 'CONFIRMED',
        'created_by' => $this->user->id,
    ]);

    $this->user->notify(new PaymentReceivedNotification($payment, $receivable));

    $response = $this->actingAs($this->user)->getJson('/api/notifications/unread');
    $response->assertStatus(200);

    $notif = $response->json('notifications.0');
    expect($notif['data']['category'])->toBe('sales');
    expect($notif['data']['action_url'])->toBe("/receivables/{$receivable->id}");
    expect($notif['data']['title'])->toBe('Abono Registrado');
    expect((float) $notif['data']['amount'])->toEqual(300.0);
});

test('daily closing discrepancy notification is structured with closings category', function () {
    $closing = DailyClosing::create([
        'uuid' => (string) Str::uuid(),
        'company_id' => $this->company->id,
        'branch_id' => $this->branch->id,
        'opened_by' => $this->user->id,
        'opened_at' => now()->subHours(8),
        'closing_date' => now()->toDateString(),
        'status' => 'CLOSED',
        'system_amount' => 500.00,
        'counted_amount' => 484.50,
        'difference_amount' => -15.50,
    ]);

    $this->user->notify(new DailyClosingDiscrepancyNotification($closing, -15.50));

    $response = $this->actingAs($this->user)->getJson('/api/notifications/unread');
    $response->assertStatus(200);

    $notif = $response->json('notifications.0');
    expect($notif['data']['category'])->toBe('closings');
    expect($notif['data']['action_url'])->toBe("/closings/{$closing->id}");
    expect($notif['data']['severity'])->toBe('warning');
    expect($notif['data']['difference'])->toBe(-15.5);
});
