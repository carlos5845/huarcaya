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
        Schema::create('lots', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('branch_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('lot_number', 50);
            $table->foreignId('inventory_entry_line_id')->nullable()->constrained()->nullOnDelete();
            $table->date('manufacturing_date')->nullable();
            $table->date('expiration_date')->nullable();
            $table->decimal('original_quantity', 15, 6);
            $table->decimal('current_quantity', 15, 6);
            $table->decimal('unit_cost', 15, 6);
            $table->string('status', 20)->default('ACTIVE');
            $table->timestamps();

            $table->unique(['branch_id', 'product_id', 'lot_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lots');
    }
};
