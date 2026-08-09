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
        Schema::create('purchase_lines', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('purchase_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->decimal('ordered_quantity', 15, 6);
            $table->decimal('unit_cost_original', 15, 6);
            $table->decimal('unit_cost_base', 15, 6);
            $table->decimal('line_subtotal', 15, 6);
            $table->decimal('tax_amount', 15, 6)->default(0);
            $table->decimal('line_total', 15, 6);
            $table->decimal('received_quantity', 15, 6)->default(0);
            $table->decimal('cancelled_quantity', 15, 6)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_lines');
    }
};
