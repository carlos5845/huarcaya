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
        Schema::create('sync_change_logs', function (Blueprint $table) {
            $table->id();
            $table->string('entity_type', 100);
            $table->string('entity_uuid', 36);
            $table->string('operation_type', 20); // CREATE, UPDATE, DELETE
            $table->timestamp('change_timestamp');
            $table->timestamps();
            
            $table->index('change_timestamp');
            $table->index(['entity_type', 'entity_uuid']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sync_change_logs');
    }
};
