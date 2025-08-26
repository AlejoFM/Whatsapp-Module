<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsAppBroadcastController extends Controller
{
    private $nodeServiceUrl;

    public function __construct()
    {
        $this->nodeServiceUrl = env('NODE_WHATSAPP_SERVICE_URL', 'http://localhost:3000');
    }

    /**
     * Enviar mensaje masivo a múltiples números de teléfono
     */
    public function sendBulkMessage(Request $request, string $sessionId): JsonResponse
    {
        try {
            $validated = $request->validate([
                'phoneNumbers' => 'required|array|min:1',
                'phoneNumbers.*' => 'required|string|regex:/^[0-9]+$/',
                'body' => 'required|string',
                'type' => 'nullable|string|in:text',
                'delay' => 'nullable|integer|min:1000|max:10000' // Delay entre mensajes en ms
            ]);

            $phoneNumbers = $validated['phoneNumbers'];
            $body = $validated['body'];
            $type = $validated['type'] ?? 'text';
            $delay = $validated['delay'] ?? 2000; // 2 segundos por defecto

            $results = [];
            $successCount = 0;
            $errorCount = 0;

            foreach ($phoneNumbers as $phoneNumber) {
                try {
                    // Enviar mensaje individual
                    $response = Http::timeout(30)->post("{$this->nodeServiceUrl}/api/whatsapp/sessions/{$sessionId}/messages", [
                        'to' => $phoneNumber,
                        'body' => $body,
                        'type' => $type
                    ]);

                    if ($response->successful()) {
                        $results[] = [
                            'phoneNumber' => $phoneNumber,
                            'status' => 'success',
                            'messageId' => $response->json('id') ?? null,
                            'timestamp' => now()->toISOString()
                        ];
                        $successCount++;
                    } else {
                        $results[] = [
                            'phoneNumber' => $phoneNumber,
                            'status' => 'error',
                            'error' => $response->json('message') ?? 'Error desconocido',
                            'statusCode' => $response->status(),
                            'timestamp' => now()->toISOString()
                        ];
                        $errorCount++;
                    }

                    // Delay entre mensajes para evitar spam
                    if (next($phoneNumbers) !== false) {
                        usleep($delay * 1000); // Convertir ms a microsegundos
                    }

                } catch (\Exception $e) {
                    $results[] = [
                        'phoneNumber' => $phoneNumber,
                        'status' => 'error',
                        'error' => 'Error de conexión: ' . $e->getMessage(),
                        'timestamp' => now()->toISOString()
                    ];
                    $errorCount++;
                    
                    Log::error("Error enviando mensaje a {$phoneNumber}: " . $e->getMessage());
                }
            }

            return response()->json([
                'success' => true,
                'message' => "Envío masivo completado. {$successCount} exitosos, {$errorCount} fallidos",
                'summary' => [
                    'total' => count($phoneNumbers),
                    'successful' => $successCount,
                    'failed' => $errorCount
                ],
                'results' => $results
            ], 200);

        } catch (\Exception $e) {
            Log::error("Error en envío masivo: " . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Error en el envío masivo: ' . $e->getMessage()
            ], 500);
        }
    }

}
