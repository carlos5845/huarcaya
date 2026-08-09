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
        Schema::create('conflicts', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('entity_type', 100);
            $table->string('entity_uuid', 36);
            $table->string('conflict_type', 50);
            $table->jsonb('server_state')->nullable();
            $table->jsonb('client_state')->nullable();
            $table->string('status', 20)->default('UNRESOLVED');
            $table->foreignId('sync_operation_id')->nullable()->constrained()->nullOnDelete();
            $table->text('resolution_notes')->nullable();
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('conflicts');
    }
};
