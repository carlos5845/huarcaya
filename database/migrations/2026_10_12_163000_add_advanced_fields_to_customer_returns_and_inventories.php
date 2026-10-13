<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('customer_returns', function (Blueprint $table) {
            // Fase 2: Cuadre financiero
            $table->string('settlement_type', 30)->default('RECEIVABLE_OFFSET')->after('return_type'); // RECEIVABLE_OFFSET, CASH_REFUND, STORE_CREDIT
            $table->foreignId('refund_payment_method_id')->nullable()->after('settlement_type')->constrained('payment_methods')->nullOnDelete();
            $table->decimal('refunded_amount', 15, 6)->default(0)->after('total_amount');
            $table->decimal('credit_applied_amount', 15, 6)->default(0)->after('refunded_amount');

            // Fase 4: Autorización de plazo y anulación controlada
            $table->foreignId('authorized_by')->nullable()->after('confirmed_by')->constrained('users')->nullOnDelete();
            $table->text('override_deadline_reason')->nullable()->after('notes');
            $table->foreignId('cancelled_by')->nullable()->after('authorized_by')->constrained('users')->nullOnDelete();
            $table->text('cancellation_reason')->nullable()->after('cancelled_at');
        });

        Schema::table('inventories', function (Blueprint $table) {
            // Fase 3: Stock en cuarentena / dañado no comercializable
            $table->decimal('damaged_quantity', 15, 6)->default(0)->after('available_quantity');
        });

        Schema::table('customers', function (Blueprint $table) {
            // Fase 2: Saldo a favor del cliente en tienda
            $table->decimal('store_credit_balance', 15, 6)->default(0)->after('status');
        });

        Schema::table('inventory_movement_lines', function (Blueprint $table) {
            // Fase 1: Vínculo directo con la línea de venta para rastrear lotes exactos
            $table->foreignId('sale_line_id')->nullable()->after('product_id')->constrained('sale_lines')->nullOnDelete();
        });

        // Insertar política de plazo máximo de devolución en settings (15 días por defecto)
        DB::table('settings')->updateOrInsert(
            ['key' => 'sales.return_max_days'],
            [
                'description' => 'Días máximos permitidos para registrar una devolución desde la emisión de la venta',
                'type' => 'integer',
                'default_value' => '15',
                'is_public' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inventory_movement_lines', function (Blueprint $table) {
            $table->dropConstrainedForeignId('sale_line_id');
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn('store_credit_balance');
        });

        Schema::table('inventories', function (Blueprint $table) {
            $table->dropColumn('damaged_quantity');
        });

        Schema::table('customer_returns', function (Blueprint $table) {
            $table->dropConstrainedForeignId('refund_payment_method_id');
            $table->dropConstrainedForeignId('authorized_by');
            $table->dropConstrainedForeignId('cancelled_by');
            $table->dropColumn([
                'settlement_type',
                'refunded_amount',
                'credit_applied_amount',
                'override_deadline_reason',
                'cancellation_reason',
            ]);
        });

        DB::table('settings')->where('key', 'sales.return_max_days')->delete();
    }
};
