<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;

class WhatsAppMessageController extends Controller
{
    private $nodeServiceUrl;

    public function __construct()
    {
        $this->nodeServiceUrl = env('NODE_WHATSAPP_SERVICE_URL', 'http://localhost:3000');
    }

    /**
     * Enviar un mensaje de WhatsApp
     */
    public function store(Request $request, string $sessionId): JsonResponse
    {
        try {
            $validated = $request->validate([
                'to' => 'required|string',
                'body' => 'required|string',
                'type' => 'nullable|string|in:text,image,document,audio,video'
            ]);

            $response = Http::post("{$this->nodeServiceUrl}/api/whatsapp/sessions/{$sessionId}/messages", $validated);
            
            if ($response->successful()) {
                return response()->json($response->json(), 201);
            }
            
            return response()->json([
                'success' => false,
                'message' => 'Error al enviar mensaje en el servicio de WhatsApp'
            ], $response->status());
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error de conexión: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener mensajes de una conversación
     */
    public function index(Request $request, string $sessionId): JsonResponse
    {
        try {
            $validated = $request->validate([
                'phoneNumber' => 'required|string',
                'limit' => 'nullable|integer|min:1|max:100',
                'offset' => 'nullable|integer|min:0'
            ]);

            $response = Http::get("{$this->nodeServiceUrl}/api/whatsapp/sessions/{$sessionId}/messages", [
                'phoneNumber' => $validated['phoneNumber'],
                'limit' => $validated['limit'] ?? 50,
                'offset' => $validated['offset'] ?? 0
            ]);
            
            if ($response->successful()) {
                return response()->json($response->json());
            }
            
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener mensajes del servicio de WhatsApp'
            ], $response->status());
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error de conexión: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener mensajes de un número específico
     */
    public function show(string $sessionId, string $phoneNumber): JsonResponse
    {
        try {
            $response = Http::get("{$this->nodeServiceUrl}/api/whatsapp/sessions/{$sessionId}/messages/{$phoneNumber}");
            
            if ($response->successful()) {
                return response()->json($response->json());
            }
            
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener mensajes del número específico'
            ], $response->status());
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error de conexión: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener mensajes de un chat específico
     */
    public function chatMessages(Request $request, string $sessionId, string $chatId): JsonResponse
    {
        try {
            $validated = $request->validate([
                'limit' => 'nullable|integer|min:1|max:100',
                'includeFromMe' => 'nullable|string|in:true,false'
            ]);

            // Convertir includeFromMe de string a boolean
            $includeFromMe = true; // valor por defecto
            if (isset($validated['includeFromMe'])) {
                $includeFromMe = $validated['includeFromMe'] === 'true';
            }

            $response = Http::get("{$this->nodeServiceUrl}/api/whatsapp/sessions/{$sessionId}/chats/{$chatId}/messages", [
                'limit' => $validated['limit'] ?? 50,
                'includeFromMe' => $includeFromMe
            ]);
            
            if ($response->successful()) {
                return response()->json($response->json());
            }
            
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener mensajes del chat'
            ], $response->status());
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error de conexión: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener mensajes avanzados de un chat
     */
    public function chatMessagesAdvanced(Request $request, string $sessionId, string $chatId): JsonResponse
    {
        try {
            $validated = $request->validate([
                'limit' => 'nullable|integer|min:1|max:100',
                'includeFromMe' => 'nullable|string|in:true,false',
                'fromDate' => 'nullable|date',
                'toDate' => 'nullable|integer',
                'messageType' => 'nullable|string',
                'searchText' => 'nullable|string'
            ]);

            // Convertir includeFromMe de string a boolean
            $includeFromMe = true; // valor por defecto
            if (isset($validated['includeFromMe'])) {
                $includeFromMe = $validated['includeFromMe'] === 'true';
            }

            // Preparar parámetros para el servicio
            $params = [
                'limit' => $validated['limit'] ?? 50,
                'includeFromMe' => $includeFromMe
            ];

            // Agregar parámetros opcionales solo si están presentes
            if (isset($validated['fromDate'])) {
                $params['fromDate'] = $validated['fromDate'];
            }
            if (isset($validated['toDate'])) {
                $params['toDate'] = $validated['toDate'];
            }
            if (isset($validated['messageType'])) {
                $params['messageType'] = $validated['messageType'];
            }
            if (isset($validated['searchText'])) {
                $params['searchText'] = $validated['searchText'];
            }

            $response = Http::get("{$this->nodeServiceUrl}/api/whatsapp/sessions/{$sessionId}/chats/{$chatId}/messages/advanced", $params);
            
            if ($response->successful()) {
                return response()->json($response->json());
            }
            
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener mensajes avanzados del chat'
            ], $response->status());
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error de conexión: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cargar más mensajes de un chat
     */
    public function loadMoreMessages(Request $request, string $sessionId, string $chatId): JsonResponse
    {
        try {
            $validated = $request->validate([
                'currentLimit' => 'required|integer|min:1',
                'additionalLimit' => 'nullable|integer|min:1|max:100'
            ]);

            $response = Http::post("{$this->nodeServiceUrl}/api/whatsapp/sessions/{$sessionId}/chats/{$chatId}/messages/load-more", $validated);
            
            if ($response->successful()) {
                return response()->json($response->json());
            }
            
            return response()->json([
                'success' => false,
                'message' => 'Error al cargar más mensajes del chat'
            ], $response->status());
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error de conexión: ' . $e->getMessage()
            ], 500);
        }
    }
}
