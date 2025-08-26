<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\WhatsAppBroadcastController;
use App\Http\Controllers\Api\V1\WhatsAppSessionController;
use App\Http\Controllers\Api\V1\WhatsAppMessageController;
use App\Http\Controllers\Api\V1\WhatsAppContactController;
use App\Http\Controllers\Api\V1\WhatsAppBroadcastController as ApiWhatsAppBroadcastController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// Rutas de Broadcasting de WhatsApp
Route::prefix('whatsapp/broadcast')->group(function () {
    Route::post('/message-received', [WhatsAppBroadcastController::class, 'emitMessageReceived']);
    Route::post('/connection-status-changed', [WhatsAppBroadcastController::class, 'emitConnectionStatusChanged']);
    Route::post('/session-status-changed', [WhatsAppBroadcastController::class, 'emitSessionStatusChanged']);
    Route::get('/status', [WhatsAppBroadcastController::class, 'getBroadcastingStatus']);
});

// Rutas de WhatsApp API - Proxy completo al servicio de Node.js
Route::prefix('whatsapp')->group(function () {
    // Sesiones
    Route::post('sessions', [WhatsAppSessionController::class, 'store']);
    Route::get('sessions', [WhatsAppSessionController::class, 'index']);
    Route::get('sessions/{sessionId}', [WhatsAppSessionController::class, 'show']);
    Route::post('sessions/{sessionId}/connect', [WhatsAppSessionController::class, 'connect']);
    Route::post('sessions/{sessionId}/disconnect', [WhatsAppSessionController::class, 'disconnect']);
    
    // Mensajes
    Route::post('sessions/{sessionId}/messages', [WhatsAppMessageController::class, 'store']);
    Route::get('sessions/{sessionId}/messages/{phoneNumber}', [WhatsAppMessageController::class, 'show']);
    
    // Contactos
    Route::get('sessions/{sessionId}/contacts', [WhatsAppContactController::class, 'index']);
    
    // Conversaciones
    Route::get('sessions/{sessionId}/conversations', [WhatsAppContactController::class, 'conversations']);
    Route::get('sessions/{sessionId}/conversations/realtime', [WhatsAppContactController::class, 'conversationsRealtime']);
    Route::get('sessions/{sessionId}/conversations/{phoneNumber}', [WhatsAppContactController::class, 'conversation']);
    Route::get('sessions/{sessionId}/conversations/contacts', [WhatsAppContactController::class, 'conversations']);
    Route::get('sessions/{sessionId}/conversations/non-contacts', [WhatsAppContactController::class, 'nonContactConversations']);
    
    // Chats y Mensajes
    Route::get('sessions/{sessionId}/chats/contacts', [WhatsAppContactController::class, 'contactChats']);
    Route::get('sessions/{sessionId}/chats/non-contacts', [WhatsAppContactController::class, 'nonContactChats']);
    Route::get('sessions/{sessionId}/chats/{chatId}/messages', [WhatsAppMessageController::class, 'chatMessages']);
    Route::get('sessions/{sessionId}/chats/{chatId}/messages/advanced', [WhatsAppMessageController::class, 'chatMessagesAdvanced']);
    Route::post('sessions/{sessionId}/chats/{chatId}/messages/load-more', [WhatsAppMessageController::class, 'loadMoreMessages']);
    
    // Sincronización
    Route::post('sessions/{sessionId}/sync/progressive', [WhatsAppSessionController::class, 'startProgressiveSync']);
    Route::post('sessions/{sessionId}/sync/progressive/continue', [WhatsAppSessionController::class, 'continueProgressiveSync']);
    Route::get('sessions/{sessionId}/sync-status', [WhatsAppSessionController::class, 'getSyncStatus']);
    Route::post('sessions/{sessionId}/force-full-sync', [WhatsAppSessionController::class, 'forceFullSync']);
    
    // Broadcasting y envío masivo
    Route::post('sessions/{sessionId}/broadcast/send-bulk', [ApiWhatsAppBroadcastController::class, 'sendBulkMessage']);
    Route::get('sessions/{sessionId}/broadcast/phone-numbers', [ApiWhatsAppBroadcastController::class, 'getConversationPhoneNumbers']);
    Route::get('sessions/{sessionId}/broadcast/stats', [ApiWhatsAppBroadcastController::class, 'getConversationStats']);
});
