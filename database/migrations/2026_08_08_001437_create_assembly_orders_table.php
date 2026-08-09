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
        Schema::create('assembly_orders', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->foreignId('kit_version_id')->constrained()->restrictOnDelete();
            $table->string('order_number', 50)->unique();
            $table->string('status', 20)->default('DRAFT'); // DRAFT, IN_PROGRESS, COMPLETED, CANCELLED
            $table->decimal('expected_quantity', 15, 6);
            $table->decimal('actual_quantity', 15, 6)->nullable();
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
        Schema::dropIfExists('assembly_orders');
    }
};
