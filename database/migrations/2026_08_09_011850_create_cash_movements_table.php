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
        Schema::create('cash_movements', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('cash_register_id')->constrained()->restrictOnDelete();
            $table->string('movement_type', 30); // OPENING, CLOSING, IN, OUT, DEPOSIT, WITHDRAWAL
            $table->decimal('amount', 15, 6);
            $table->char('currency_code', 3)->default('PEN');
            $table->timestamp('operation_date');
            $table->string('reference_type', 50)->nullable();
            $table->bigInteger('reference_id')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cash_movements');
    }
};
