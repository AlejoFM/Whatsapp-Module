<?php

namespace App\Http\Controllers;

use App\Domain\Events\WhatsAppMessageReceived;
use App\Domain\Events\WhatsAppConnectionStatusChanged;
use App\Domain\Events\WhatsAppSessionStatusChanged;
use App\Domain\Entities\WhatsAppMessage;
use App\Domain\Entities\WhatsAppSession;
use App\Domain\ValueObjects\SessionStatus;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class WhatsAppBroadcastController extends Controller
{
    /**
     * Emitir evento de mensaje recibido
     */
    public function emitMessageReceived(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'session_id' => 'required|string',
                'from' => 'required|string',
                'to' => 'required|string',
                'body' => 'required|string',
                'type' => 'string|in:text,image,video,audio,document',
                'metadata' => 'array',
            ]);

            // Crear mensaje (aquí deberías usar tu repositorio real)
            $message = new WhatsAppMessage();
            $message->session_id = $validated['session_id'];
            $message->from = $validated['from'];
            $message->to = $validated['to'];
            $message->body = $validated['body'];
            $message->type = $validated['type'] ?? 'text';
            $message->metadata = $validated['metadata'] ?? [];
            $message->timestamp = now();

            // Emitir evento
            event(new WhatsAppMessageReceived($message));

            Log::info('Evento de mensaje recibido emitido', [
                'session_id' => $validated['session_id'],
                'from' => $validated['from'],
                'message_id' => $message->id ?? 'temp'
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Evento emitido correctamente',
                'data' => $message
            ]);

        } catch (\Exception $e) {
            Log::error('Error al emitir evento de mensaje recibido', [
                'error' => $e->getMessage(),
                'request_data' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al emitir evento',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Emitir evento de cambio de estado de conexión
     */
    public function emitConnectionStatusChanged(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'session_id' => 'required|string',
                'is_connected' => 'required|boolean',
                'status' => 'string',
            ]);

            // Emitir evento
            event(new WhatsAppConnectionStatusChanged(
                $validated['session_id'],
                $validated['is_connected'],
                $validated['status'] ?? null
            ));

            Log::info('Evento de cambio de estado de conexión emitido', [
                'session_id' => $validated['session_id'],
                'is_connected' => $validated['is_connected'],
                'status' => $validated['status'] ?? 'unknown'
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Evento emitido correctamente'
            ]);

        } catch (\Exception $e) {
            Log::error('Error al emitir evento de cambio de conexión', [
                'error' => $e->getMessage(),
                'request_data' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al emitir evento',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Emitir evento de cambio de estado de sesión
     */
    public function emitSessionStatusChanged(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'session_id' => 'required|string',
                'old_status' => 'required|string',
                'new_status' => 'required|string',
            ]);

            // Crear sesión temporal para el evento
            $session = new WhatsAppSession();
            $session->session_id = $validated['session_id'];

            $oldStatus = new SessionStatus($validated['old_status']);
            $newStatus = new SessionStatus($validated['new_status']);

            // Emitir evento
            event(new WhatsAppSessionStatusChanged($session, $oldStatus, $newStatus));

            Log::info('Evento de cambio de estado de sesión emitido', [
                'session_id' => $validated['session_id'],
                'old_status' => $validated['old_status'],
                'new_status' => $validated['new_status']
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Evento emitido correctamente'
            ]);

        } catch (\Exception $e) {
            Log::error('Error al emitir evento de cambio de estado de sesión', [
                'error' => $e->getMessage(),
                'request_data' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al emitir evento',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener estado de broadcasting
     */
    public function getBroadcastingStatus(): JsonResponse
    {
        $status = [
            'broadcasting_driver' => config('broadcasting.default'),
            'queue_connection' => config('queue.default'),
            'redis_connection' => config('database.redis.default.host') ?? 'not_configured',
            'channels' => [
                'whatsapp.sessions' => 'public',
                'whatsapp.messages' => 'public',
                'whatsapp.connections' => 'public',
                'whatsapp.session.{id}' => 'private'
            ]
        ];

        return response()->json([
            'success' => true,
            'data' => $status
        ]);
    }
}
