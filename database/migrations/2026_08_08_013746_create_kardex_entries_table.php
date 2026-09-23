<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('kardex_entries', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('branch_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('inventory_movement_line_id')->nullable()->constrained('inventory_movement_lines', 'id')->nullOnDelete();

            // Secuencia y Auditoría
            $table->bigInteger('sequence_number')->unsigned()->unique();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('device_id')->nullable();

            // Fechas
            $table->timestamp('operation_date'); // Fecha en que ocurrió realmente (ej. en tablet offline)

            $table->string('operation_type', 50);
            $table->string('reference')->nullable();

            $table->decimal('input_quantity', 15, 6)->default(0);
            $table->decimal('input_unit_cost', 15, 6)->default(0);
            $table->decimal('input_total_cost', 15, 6)->default(0);
            $table->decimal('output_quantity', 15, 6)->default(0);
            $table->decimal('output_unit_cost', 15, 6)->default(0);
            $table->decimal('output_total_cost', 15, 6)->default(0);
            $table->decimal('balance_quantity', 15, 6)->default(0);
            $table->decimal('balance_unit_cost', 15, 6)->default(0);
            $table->decimal('balance_total_cost', 15, 6)->default(0);

            // Trazabilidad de reversiones
            $table->foreignId('original_entry_id')->nullable()->constrained('kardex_entries')->nullOnDelete();
            $table->foreignId('reversed_by_entry_id')->nullable()->constrained('kardex_entries')->nullOnDelete();

            // Sincronización PWA
            $table->string('sync_status', 20)->default('SYNCED');
            $table->text('notes')->nullable();

            $table->timestamps(); // created_at será la fecha de registro oficial en el servidor
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kardex_entries');
    }
};
