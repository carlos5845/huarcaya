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
        Schema::create('sync_operations', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('device_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('entity_type', 100);
            $table->string('entity_uuid', 36);
            $table->string('operation_type', 20); // CREATE, UPDATE, DELETE
            $table->jsonb('payload');
            $table->string('status', 20)->default('PENDING'); // PENDING, PROCESSING, SUCCESS, FAILED
            $table->integer('retry_count')->default(0);
            $table->text('error_message')->nullable();
            $table->timestamp('client_timestamp');
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sync_operations');
    }
};
