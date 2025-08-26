<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\WhatsAppMessageBroker;
use Illuminate\Support\Facades\Log;

class StartWhatsAppBroker extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'whatsapp:broker {--daemon : Ejecutar en modo daemon}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Iniciar broker de RabbitMQ para mensajes de WhatsApp';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🚀 Iniciando WhatsApp RabbitMQ Broker...');
        $this->info('📡 Escuchando colas: whatsapp.messages, whatsapp.connections, whatsapp.sessions');
        
        if ($this->option('daemon')) {
            $this->info('👻 Modo daemon activado');
        }

        try {
            $broker = new WhatsAppMessageBroker();
            
            // Verificar conexión RabbitMQ
            $stats = $broker->getStats();
            if (!$stats['is_connected']) {
                $this->error('❌ No se puede conectar a RabbitMQ');
                $this->error('💡 Asegúrate de que RabbitMQ esté corriendo en localhost:5672');
                return 1;
            }
            
            $this->info('✅ Conexión a RabbitMQ establecida');
            $this->info('📋 Colas configuradas: ' . implode(', ', $stats['queues']));
            $this->info('💀 Dead Letter Queue: ' . $stats['dead_letter_queue']);
            
            // Configurar manejador de señales para detener gracefully
            if (extension_loaded('pcntl')) {
                pcntl_signal(SIGTERM, function () use ($broker) {
                    $this->info('🛑 Señal SIGTERM recibida, deteniendo...');
                    $broker->stopConsuming();
                    $broker->close();
                    exit(0);
                });
                
                pcntl_signal(SIGINT, function () use ($broker) {
                    $this->info('🛑 Señal SIGINT recibida, deteniendo...');
                    $broker->stopConsuming();
                    $broker->close();
                    exit(0);
                });
            }
            
            $this->info('🔄 Iniciando broker...');
            $this->info('🔄 Presiona Ctrl+C para detener');
            
            // Iniciar broker
            $broker->startConsuming();
            
        } catch (\Exception $e) {
            $this->error('❌ Error iniciando broker: ' . $e->getMessage());
            Log::error('Error en WhatsApp Broker: ' . $e->getMessage());
            return 1;
        }

        return 0;
    }
}
