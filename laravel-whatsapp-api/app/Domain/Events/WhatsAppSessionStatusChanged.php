<?php

namespace App\Domain\Events;

use App\Domain\Entities\WhatsAppSession;
use App\Domain\ValueObjects\SessionStatus;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class WhatsAppSessionStatusChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public WhatsAppSession $session;
    public SessionStatus $oldStatus;
    public SessionStatus $newStatus;

    public function __construct(WhatsAppSession $session, SessionStatus $oldStatus, SessionStatus $newStatus)
    {
        $this->session = $session;
        $this->oldStatus = $oldStatus;
        $this->newStatus = $newStatus;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('whatsapp.session.' . $this->session->id),
            new Channel('whatsapp.sessions'),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'session.status.changed';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'session_id' => $this->session->session_id,
            'old_status' => $this->oldStatus->getValue(),
            'new_status' => $this->newStatus->getValue(),
            'timestamp' => now()->toISOString(),
        ];
    }
}
