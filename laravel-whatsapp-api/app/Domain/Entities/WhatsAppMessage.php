<?php

namespace App\Domain\Entities;

use App\Domain\ValueObjects\MessageId;
use App\Domain\ValueObjects\MessageType;
use App\Domain\ValueObjects\MessageDirection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WhatsAppMessage extends Model
{
    protected $fillable = [
        'message_id',
        'conversation_id',
        'session_id',
        'from_phone',
        'to_phone',
        'content',
        'type',
        'direction',
        'timestamp',
        'is_read',
        'metadata'
    ];

    protected $casts = [
        'timestamp' => 'datetime',
        'is_read' => 'boolean',
        'metadata' => 'array'
    ];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(WhatsAppConversation::class, 'conversation_id', 'conversation_id');
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(WhatsAppSession::class, 'session_id', 'session_id');
    }

    public function getMessageId(): MessageId
    {
        return new MessageId($this->message_id);
    }

    public function getType(): MessageType
    {
        return new MessageType($this->type);
    }

    public function getDirection(): MessageDirection
    {
        return new MessageDirection($this->direction);
    }

    public function markAsRead(): void
    {
        $this->is_read = true;
        $this->save();
    }

    public function isIncoming(): bool
    {
        return $this->direction === MessageDirection::INCOMING;
    }

    public function isOutgoing(): bool
    {
        return $this->direction === MessageDirection::OUTGOING;
    }
}
