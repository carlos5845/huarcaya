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
        Schema::create('devices', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('branch_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('type', 20)->default('POS'); // POS, TABLET, MOBILE
            $table->string('status', 20)->default('AUTHORIZED'); // AUTHORIZED, PENDING, BLOCKED
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamp('last_synced_at')->nullable();
            $table->bigInteger('last_pull_sequence')->default(0);
            $table->timestamp('last_push_at')->nullable();
            $table->timestamp('last_pull_at')->nullable();
            $table->string('app_version', 20)->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('devices');
    }
};
