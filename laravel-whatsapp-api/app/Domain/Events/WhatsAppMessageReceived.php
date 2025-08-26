<?php

namespace App\Domain\Events;

use App\Domain\Entities\WhatsAppMessage;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class WhatsAppMessageReceived implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public WhatsAppMessage $message;

    public function __construct(WhatsAppMessage $message)
    {
        $this->message = $message;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('whatsapp.session.' . $this->message->session_id),
            new Channel('whatsapp.messages'),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'message.received';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [

            'message_id' => $this->message->message_id,
            'session_id' => $this->message->session_id,
            'from' => $this->message->from_phone,
            'to' => $this->message->to_phone,
            'body' => $this->message->content,
            'type' => $this->message->type,
            'timestamp' => $this->message->timestamp,
            'metadata' => $this->message->metadata,
        ];
    }
}
