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
        Schema::create('whatsapp_messages', function (Blueprint $table) {
            $table->id();
            $table->string('message_id')->unique();
            $table->string('conversation_id')->nullable();
            $table->string('session_id');
            $table->string('from_phone');
            $table->string('to_phone');
            $table->text('content');
            $table->string('type')->default('text');
            $table->enum('direction', ['incoming', 'outgoing'])->default('incoming');
            $table->timestamp('timestamp');
            $table->boolean('is_read')->default(false);
            $table->json('metadata')->nullable();
            $table->timestamps();
            
            $table->index(['session_id']);
            $table->index(['conversation_id']);
            $table->index(['timestamp']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('whatsapp_messages');
    }
};
