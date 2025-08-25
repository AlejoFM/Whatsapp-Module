<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;

class WhatsAppContactController extends Controller
{
    private $nodeServiceUrl;

    public function __construct()
    {
        $this->nodeServiceUrl = env('NODE_WHATSAPP_SERVICE_URL', 'http://localhost:3000');
    }

    /**
     * Obtener contactos de una sesión
     */
    public function index(Request $request, string $sessionId): JsonResponse
    {
        try {
            $validated = $request->validate([
                'limit' => 'nullable|integer|min:1|max:100',
                'offset' => 'nullable|integer|min:0'
            ]);

            $response = Http::get("{$this->nodeServiceUrl}/api/whatsapp/sessions/{$sessionId}/contacts", [
                'limit' => $validated['limit'] ?? 100,
                'offset' => $validated['offset'] ?? 0
            ]);
            
            if ($response->successful()) {
                return response()->json($response->json());
            }
            
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener contactos del servicio de WhatsApp'
            ], $response->status());
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error de conexión: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener conversaciones de contactos
     */
    public function conversations(Request $request, string $sessionId): JsonResponse
    {
        try {
            $validated = $request->validate([
                'limit' => 'nullable|integer|min:1|max:100',
                'offset' => 'nullable|integer|min:0'
            ]);

            $response = Http::get("{$this->nodeServiceUrl}/api/whatsapp/sessions/{$sessionId}/conversations/contacts", [
                'limit' => $validated['limit'] ?? 100,
                'offset' => $validated['offset'] ?? 0
            ]);
            
            if ($response->successful()) {
                return response()->json($response->json());
            }
            
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener conversaciones del servicio de WhatsApp'
            ], $response->status());
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error de conexión: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener conversaciones que no son contactos
     */
    public function nonContactConversations(Request $request, string $sessionId): JsonResponse
    {
        try {
            $validated = $request->validate([
                'limit' => 'nullable|integer|min:1|max:100',
                'offset' => 'nullable|integer|min:0'
            ]);

            $response = Http::get("{$this->nodeServiceUrl}/api/whatsapp/sessions/{$sessionId}/conversations/non-contacts", [
                'limit' => $validated['limit'] ?? 100,
                'offset' => $validated['offset'] ?? 0
            ]);
            
            if ($response->successful()) {
                return response()->json($response->json());
            }
            
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener conversaciones no contactos del servicio de WhatsApp'
            ], $response->status());
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error de conexión: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener conversaciones en tiempo real
     */
    public function conversationsRealtime(Request $request, string $sessionId): JsonResponse
    {
        try {
            $validated = $request->validate([
                'limit' => 'nullable|integer|min:1|max:100',
                'offset' => 'nullable|integer|min:0'
            ]);

            $response = Http::get("{$this->nodeServiceUrl}/api/whatsapp/sessions/{$sessionId}/conversations/realtime", [
                'limit' => $validated['limit'] ?? 50,
                'offset' => $validated['offset'] ?? 0
            ]);
            
            if ($response->successful()) {
                return response()->json($response->json());
            }
            
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener conversaciones en tiempo real'
            ], $response->status());
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error de conexión: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener conversación específica
     */
    public function conversation(string $sessionId, string $phoneNumber): JsonResponse
    {
        try {
            $response = Http::get("{$this->nodeServiceUrl}/api/whatsapp/sessions/{$sessionId}/conversations/{$phoneNumber}");
            
            if ($response->successful()) {
                return response()->json($response->json());
            }
            
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener conversación específica'
            ], $response->status());
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error de conexión: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener chats de contactos
     */
    public function contactChats(Request $request, string $sessionId): JsonResponse
    {
        try {
            $validated = $request->validate([
                'limit' => 'nullable|integer|min:1|max:100',
                'offset' => 'nullable|integer|min:0'
            ]);

            $response = Http::get("{$this->nodeServiceUrl}/api/whatsapp/sessions/{$sessionId}/chats/contacts", [
                'limit' => $validated['limit'] ?? 20,
                'offset' => $validated['offset'] ?? 0
            ]);
            
            if ($response->successful()) {
                return response()->json($response->json());
            }
            
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener chats de contactos'
            ], $response->status());
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error de conexión: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener chats no contactos
     */
    public function nonContactChats(Request $request, string $sessionId): JsonResponse
    {
        try {
            $validated = $request->validate([
                'limit' => 'nullable|integer|min:1|max:100',
                'offset' => 'nullable|integer|min:0'
            ]);

            $response = Http::get("{$this->nodeServiceUrl}/api/whatsapp/sessions/{$sessionId}/chats/non-contacts", [
                'limit' => $validated['limit'] ?? 20,
                'offset' => $validated['offset'] ?? 0
            ]);
            
            if ($response->successful()) {
                return response()->json($response->json());
            }
            
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener chats no contactos'
            ], $response->status());
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error de conexión: ' . $e->getMessage()
            ], 500);
        }
    }
}
