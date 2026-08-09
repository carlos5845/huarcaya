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
        Schema::create('sale_lines', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('sale_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->foreignId('kit_version_id')->nullable()->constrained()->nullOnDelete();
            $table->string('product_type_snapshot', 30);
            $table->string('product_reference_snapshot');
            $table->string('product_name_snapshot');
            $table->decimal('quantity', 15, 6);
            $table->decimal('unit_price', 15, 6);
            $table->decimal('unit_cost_base', 15, 6)->default(0);
            $table->decimal('line_subtotal', 15, 6);
            $table->decimal('discount_amount', 15, 6)->default(0);
            $table->decimal('tax_amount', 15, 6)->default(0);
            $table->decimal('line_total', 15, 6);
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sale_lines');
    }
};
