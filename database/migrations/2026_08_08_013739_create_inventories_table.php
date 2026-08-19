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
        Schema::create('inventories', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('branch_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->decimal('physical_quantity', 15, 6)->default(0);
            $table->decimal('available_quantity', 15, 6)->default(0);
            $table->decimal('average_cost', 15, 6)->default(0);
            $table->string('status', 20)->default('ACTIVE');
            $table->timestamp('last_counted_at')->nullable();
            $table->timestamps();

            $table->unique(['branch_id', 'product_id'], 'inv_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventories');
    }
};
