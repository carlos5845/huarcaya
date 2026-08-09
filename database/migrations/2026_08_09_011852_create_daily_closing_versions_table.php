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
        Schema::create('daily_closing_versions', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('daily_closing_id')->constrained()->cascadeOnDelete();
            $table->integer('version_number');
            $table->jsonb('snapshot_data'); // Almacenará totales por método de pago, ventas, etc.
            $table->decimal('total_expected', 15, 6)->default(0);
            $table->decimal('total_counted', 15, 6)->default(0);
            $table->decimal('total_difference', 15, 6)->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('daily_closing_versions');
    }
};
