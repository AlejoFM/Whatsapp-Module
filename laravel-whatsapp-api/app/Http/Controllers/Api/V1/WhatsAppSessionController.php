<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;

class WhatsAppSessionController extends Controller
{
    private $nodeServiceUrl;

    public function __construct()
    {
        // URL del servicio de Node.js (desde variables de entorno o configuración)
        $this->nodeServiceUrl = env('NODE_WHATSAPP_SERVICE_URL', 'http://localhost:3000');
    }

    /**
     * Obtener todas las sesiones de WhatsApp
     */
    public function index(): JsonResponse
    {
        try {
            $response = Http::get("{$this->nodeServiceUrl}/api/whatsapp/sessions");
            
            if ($response->successful()) {
                return response()->json($response->json());
            }
            
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener sesiones del servicio de WhatsApp'
            ], $response->status());
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error de conexión: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Crear una nueva sesión de WhatsApp
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'clientId' => 'required|string',
                'phoneNumber' => 'nullable|string'
            ]);

            $response = Http::post("{$this->nodeServiceUrl}/api/whatsapp/sessions", $validated);
            
            if ($response->successful()) {
                return response()->json($response->json(), 201);
            }
            
            return response()->json([
                'success' => false,
                'message' => 'Error al crear sesión en el servicio de WhatsApp'
            ], $response->status());
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error de conexión: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener el estado de una sesión específica
     */
    public function show(string $id): JsonResponse
    {
        try {
            $response = Http::get("{$this->nodeServiceUrl}/api/whatsapp/sessions/{$id}");   
            
            if ($response->successful()) {
                return response()->json($response->json());
            }
            
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener sesión del servicio de WhatsApp'
            ], $response->status());
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error de conexión: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Conectar una sesión de WhatsApp
     */
    public function connect(string $id): JsonResponse
    {
        try {
            $response = Http::post("{$this->nodeServiceUrl}/api/whatsapp/sessions/{$id}/connect");
            
            if ($response->successful()) {
                return response()->json($response->json());
            }
            
            return response()->json([
                'success' => false,
                'message' => 'Error al conectar sesión en el servicio de WhatsApp'
            ], $response->status());
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error de conexión: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Desconectar una sesión de WhatsApp
     */
    public function disconnect(string $id): JsonResponse
    {
        try {
            $response = Http::post("{$this->nodeServiceUrl}/api/whatsapp/sessions/{$id}/disconnect");
            
            if ($response->successful()) {
                return response()->json($response->json());
            }
            
            return response()->json([
                'success' => false,
                'message' => 'Error al desconectar sesión en el servicio de WhatsApp'
            ], $response->status());
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error de conexión: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Iniciar sincronización progresiva
     */
    public function startProgressiveSync(string $id, Request $request): JsonResponse
    {
        try {
            $batchSize = $request->query('batchSize', 10);
            $response = Http::post("{$this->nodeServiceUrl}/api/whatsapp/sessions/{$id}/sync/progressive", ['batchSize' => $batchSize]);
            
            if ($response->successful()) {
                return response()->json($response->json());
            }
            
            return response()->json([
                'success' => false,
                'message' => 'Error al iniciar sincronización progresiva'
            ], $response->status());
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error de conexión: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Continuar sincronización progresiva
     */
    public function continueProgressiveSync(string $id, Request $request): JsonResponse
    {
        try {
            $offset = $request->query('offset', 0);
            $batchSize = $request->query('batchSize', 10);
            $response = Http::post("{$this->nodeServiceUrl}/api/whatsapp/sessions/{$id}/sync/progressive/continue", [
                'offset' => $offset,
                'batchSize' => $batchSize
            ]);
            
            if ($response->successful()) {
                return response()->json($response->json());
            }
            
            return response()->json([
                'success' => false,
                'message' => 'Error al continuar sincronización progresiva'
            ], $response->status());
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error de conexión: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener estado de sincronización
     */
    public function getSyncStatus(string $id): JsonResponse
    {
        try {
            $response = Http::get("{$this->nodeServiceUrl}/api/whatsapp/sessions/{$id}/sync-status");
            
            if ($response->successful()) {
                return response()->json($response->json());
            }
            
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener estado de sincronización'
            ], $response->status());
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error de conexión: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Forzar sincronización completa
     */
    public function forceFullSync(string $id): JsonResponse
    {
        try {
            $response = Http::post("{$this->nodeServiceUrl}/api/whatsapp/sessions/{$id}/force-full-sync");
            
            if ($response->successful()) {
                return response()->json($response->json());
            }
            
            return response()->json([
                'success' => false,
                'message' => 'Error al forzar sincronización completa'
            ], $response->status());
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error de conexión: ' . $e->getMessage()
            ], 500);
        }
    }
}
