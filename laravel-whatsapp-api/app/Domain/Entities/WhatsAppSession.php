<?php

namespace App\Domain\Entities;

use App\Domain\ValueObjects\PhoneNumber;
use App\Domain\ValueObjects\SessionId;
use App\Domain\ValueObjects\SessionStatus;
use App\Domain\Events\WhatsAppSessionCreated;
use App\Domain\Events\WhatsAppSessionStatusChanged;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WhatsAppSession extends Model
{
    protected $fillable = [
        'session_id',
        'phone_number',
        'status',
        'qr_code',
        'is_active',
        'last_activity',
        'metadata'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'last_activity' => 'datetime',
        'metadata' => 'array'
    ];

    protected $dispatchesEvents = [
        'created' => WhatsAppSessionCreated::class,
    ];

    public function __construct(array $attributes = [])
    {
        parent::__construct($attributes);
        
        if (empty($this->session_id)) {
            $this->session_id = SessionId::generate();
        }
    }

    public function getSessionId(): SessionId
    {
        return new SessionId($this->session_id);
    }

    public function getPhoneNumber(): PhoneNumber
    {
        return new PhoneNumber($this->phone_number);
    }

    public function getStatus(): SessionStatus
    {
        return new SessionStatus($this->status);
    }

    public function changeStatus(SessionStatus $newStatus): void
    {
        $oldStatus = $this->getStatus();
        $this->status = $newStatus->getValue();
        $this->save();

        event(new WhatsAppSessionStatusChanged($this, $oldStatus, $newStatus));
    }

    public function activate(): void
    {
        $this->is_active = true;
        $this->last_activity = now();
        $this->save();
    }

    public function deactivate(): void
    {
        $this->is_active = false;
        $this->save();
    }

    public function updateActivity(): void
    {
        $this->last_activity = now();
        $this->save();
    }

    public function conversations(): HasMany
    {
        return $this->hasMany(WhatsAppConversation::class, 'session_id', 'session_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(WhatsAppMessage::class, 'session_id', 'session_id');
    }
}
