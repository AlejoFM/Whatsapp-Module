<?php

namespace App\Domain\Entities;

use App\Domain\ValueObjects\PhoneNumber;
use App\Domain\ValueObjects\ConversationId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WhatsAppConversation extends Model
{
    protected $fillable = [
        'conversation_id',
        'session_id',
        'contact_phone',
        'contact_name',
        'last_message_at',
        'unread_count',
        'is_archived'
    ];

    protected $casts = [
        'last_message_at' => 'datetime',
        'unread_count' => 'integer',
        'is_archived' => 'boolean'
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(WhatsAppSession::class, 'session_id', 'session_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(WhatsAppMessage::class, 'conversation_id', 'conversation_id');
    }

    public function getContactPhone(): PhoneNumber
    {
        return new PhoneNumber($this->contact_phone);
    }

    public function getConversationId(): ConversationId
    {
        return new ConversationId($this->conversation_id);
    }

    public function updateLastMessage(): void
    {
        $this->last_message_at = now();
        $this->save();
    }

    public function incrementUnreadCount(): void
    {
        $this->unread_count++;
        $this->save();
    }

    public function resetUnreadCount(): void
    {
        $this->unread_count = 0;
        $this->save();
    }

    public function archive(): void
    {
        $this->is_archived = true;
        $this->save();
    }

    public function unarchive(): void
    {
        $this->is_archived = false;
        $this->save();
    }
}
