<?php

namespace App\Services;

use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;
use PhpAmqpLib\Channel\AMQPChannel;
use Illuminate\Support\Facades\Log;
use App\Domain\Events\WhatsAppMessageReceived;
use App\Domain\Events\WhatsAppConnectionStatusChanged;
use App\Domain\Events\WhatsAppSessionStatusChanged;
use App\Domain\Entities\WhatsAppMessage;
use Illuminate\Support\Facades\Event;

class WhatsAppMessageBroker
{
    private $connection;
    private $channel;
    private $isRunning = false;
    
    // Configuración de colas
    private $queues = [
        'whatsapp.messages' => 'whatsapp_messages_queue',
        'whatsapp.connections' => 'whatsapp_connections_queue',
        'whatsapp.sessions' => 'whatsapp_sessions_queue'
    ];
    
    // Cola de mensajes fallidos
    private $deadLetterQueue = 'whatsapp_dead_letter_queue';

    public function __construct()
    {
        $this->connect();
    }

    /**
     * Conectar a RabbitMQ
     */
    private function connect()
    {
        try {
            $this->connection = new AMQPStreamConnection(
                config('queue.connections.rabbitmq.host', 'localhost'),
                config('queue.connections.rabbitmq.port', 5672),
                config('queue.connections.rabbitmq.user', 'guest'),
                config('queue.connections.rabbitmq.password', 'guest'),
                config('queue.connections.rabbitmq.vhost', '/')
            );

            $this->channel = $this->connection->channel();
            $this->setupQueues();
            
            Log::info('✅ Conectado a RabbitMQ exitosamente');
            
        } catch (\Exception $e) {
            Log::error('❌ Error conectando a RabbitMQ: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Configurar colas y exchanges
     */
    private function setupQueues()
    {
        // Declarar exchange principal
        $this->channel->exchange_declare(
            'whatsapp_events',
            'topic',
            false,
            true,
            false
        );

        // Declarar cola de mensajes fallidos
        $this->channel->queue_declare(
            $this->deadLetterQueue,
            false,
            true,
            false,
            false
        );

        // Configurar cada cola
        foreach ($this->queues as $routingKey => $queueName) {
            $this->setupQueue($routingKey, $queueName);
        }
    }

    /**
     * Configurar una cola específica
     */
    private function setupQueue($routingKey, $queueName)
    {
        try {
            // Declarar cola de forma simple (sin dead letter por ahora)
            $this->channel->queue_declare(
                $queueName,
                false,  // passive
                true,   // durable
                false,  // exclusive
                false   // auto_delete
            );

            // Vincular cola al exchange
            $this->channel->queue_bind(
                $queueName,
                'whatsapp_events',
                $routingKey
            );

            Log::info("📋 Cola configurada: {$queueName} con routing key: {$routingKey}");
            
        } catch (\Exception $e) {
            Log::error("Error configurando cola {$queueName}: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Iniciar consumo de mensajes
     */
    public function startConsuming()
    {
        if ($this->isRunning) {
            Log::warning('WhatsAppMessageBroker ya está ejecutándose');
            return;
        }

        $this->isRunning = true;
        Log::info('🚀 Iniciando consumo de mensajes de RabbitMQ...');

        try {
            // Configurar QoS
            $this->channel->basic_qos(null, 1, null);

            // Consumir mensajes de cada cola
            foreach ($this->queues as $routingKey => $queueName) {
                $this->channel->basic_consume(
                    $queueName,
                    '',
                    false,
                    false,
                    false,
                    false,
                    function (AMQPMessage $msg) use ($routingKey) {
                        $this->handleMessage($routingKey, $msg);
                    }
                );
            }

            Log::info('✅ Consumo iniciado. Esperando mensajes...');

            // Loop principal de consumo
            while ($this->isRunning) {
                $this->channel->wait();
            }

        } catch (\Exception $e) {
            Log::error('Error en consumo de mensajes: ' . $e->getMessage());
            $this->isRunning = false;
        }
    }

    /**
     * Manejar mensaje recibido
     */
    private function handleMessage($routingKey, AMQPMessage $msg)
    {
        try {
            $data = json_decode($msg->body, true);
            
            if (!$data) {
                Log::warning('Mensaje inválido recibido', [
                    'routingKey' => $routingKey,
                    'body' => $msg->body
                ]);
                
                // Rechazar mensaje (irá a dead letter queue)
                $msg->delivery_info['channel']->basic_nack($msg->delivery_info['delivery_tag'], false, true);
                return;
            }

            Log::info('📨 Mensaje recibido de RabbitMQ', [
                'routingKey' => $routingKey,
                'type' => $data['type'] ?? 'unknown',
                'data' => $data
            ]);

            // Procesar mensaje según el tipo
            $this->processMessage($routingKey, $data);

            // Confirmar procesamiento exitoso
            $msg->delivery_info['channel']->basic_ack($msg->delivery_info['delivery_tag']);
            
            Log::info('✅ Mensaje procesado exitosamente', ['routingKey' => $routingKey]);

        } catch (\Exception $e) {
            Log::error('Error procesando mensaje', [
                'routingKey' => $routingKey,
                'error' => $e->getMessage(),
                'body' => $msg->body
            ]);

            // Rechazar mensaje (irá a dead letter queue)
            $msg->delivery_info['channel']->basic_nack($msg->delivery_info['delivery_tag'], false, true);
        }
    }

    /**
     * Procesar mensaje según el tipo
     */
    private function processMessage($routingKey, $data)
    {
        switch ($routingKey) {
            case 'whatsapp.messages':
                $this->processWhatsAppMessage($data);
                break;
                
            case 'whatsapp.connections':
                $this->processConnectionStatus($data);
                break;
                
            case 'whatsapp.sessions':
                $this->processSessionStatus($data);
                break;
                
            default:
                Log::warning('Routing key no reconocido', ['routingKey' => $routingKey]);
        }
    }

    /**
     * Procesar mensaje de WhatsApp
     */
    private function processWhatsAppMessage($data)
    {
        try {
            // Crear entidad de mensaje
            $message = new WhatsAppMessage();
            $message->message_id = $data['metadata']['messageId'] ?? uniqid();
            $message->session_id = $data['session_id'];
            $message->from_phone = $data['from'];
            $message->to_phone = $data['to'];
            $message->content = $data['body'];
            $message->type = $data['type'] ?? 'text';
            $message->direction = 'incoming';
            $message->timestamp = now();
            $message->metadata = $data['metadata'] ?? [];
            
            // Guardar en la base de datos
            $message->save();

            Log::info('📱 Procesando mensaje de WhatsApp', [
                'session_id' => $message->session_id,
                'from' => $message->from_phone,
                'body' => substr($message->content, 0, 50) . '...'
            ]);

            // Emitir evento de broadcasting
            Event::dispatch(new WhatsAppMessageReceived($message));

            Log::info('✅ Evento de mensaje recibido emitido exitosamente', [
                'session_id' => $message->session_id,
                'from' => $message->from
            ]);

        } catch (\Exception $e) {
            Log::error('Error procesando mensaje de WhatsApp', [
                'error' => $e->getMessage(),
                'data' => $data
            ]);
            throw $e; // Re-lanzar para que vaya a dead letter queue
        }
    }

    /**
     * Procesar cambio de estado de conexión
     */
    private function processConnectionStatus($data)
    {
        try {
            Log::info('🔌 Estado de conexión cambiado', [
                'session_id' => $data['session_id'],
                'is_connected' => $data['is_connected']
            ]);

            Event::dispatch(new WhatsAppConnectionStatusChanged(
                $data['session_id'],
                $data['is_connected'],
                $data['status'] ?? null
            ));

        } catch (\Exception $e) {
            Log::error('Error procesando cambio de estado de conexión', [
                'error' => $e->getMessage(),
                'data' => $data
            ]);
            throw $e;
        }
    }

    /**
     * Procesar cambio de estado de sesión
     */
    private function processSessionStatus($data)
    {
        try {
            Log::info('📋 Estado de sesión cambiado', [
                'session_id' => $data['session_id'],
                'old_status' => $data['old_status'],
                'new_status' => $data['new_status']
            ]);

            Event::dispatch(new WhatsAppSessionStatusChanged(
                $data['session_id'],
                $data['old_status'],
                $data['new_status']
            ));

        } catch (\Exception $e) {
            Log::error('Error procesando cambio de estado de sesión', [
                'error' => $e->getMessage(),
                'data' => $data
            ]);
            throw $e;
        }
    }

    /**
     * Detener consumo
     */
    public function stopConsuming()
    {
        $this->isRunning = false;
        Log::info('🛑 Deteniendo consumo de mensajes');
        
        if ($this->channel) {
            $this->channel->basic_cancel('');
        }
    }

    /**
     * Cerrar conexiones
     */
    public function close()
    {
        try {
            if ($this->channel) {
                $this->channel->close();
            }
            if ($this->connection) {
                $this->connection->close();
            }
            Log::info('🔌 Conexiones de RabbitMQ cerradas');
        } catch (\Exception $e) {
            Log::error('Error cerrando conexiones: ' . $e->getMessage());
        }
    }

    /**
     * Verificar estado de conexión
     */
    public function isConnected()
    {
        try {
            return $this->connection && $this->connection->isConnected();
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Obtener estadísticas
     */
    public function getStats()
    {
        return [
            'is_running' => $this->isRunning,
            'is_connected' => $this->isConnected(),
            'queues' => array_values($this->queues),
            'dead_letter_queue' => $this->deadLetterQueue
        ];
    }
}
