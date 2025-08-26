<?php

namespace App\Domain\Repositories;

use App\Domain\Entities\WhatsAppSession;
use App\Domain\ValueObjects\SessionId;
use App\Domain\ValueObjects\PhoneNumber;
use App\Domain\ValueObjects\SessionStatus;
use Illuminate\Support\Collection;

interface WhatsAppSessionRepositoryInterface
{
    public function findById(SessionId $sessionId): ?WhatsAppSession;
    
    public function findByPhoneNumber(PhoneNumber $phoneNumber): ?WhatsAppSession;
    
    public function findByStatus(SessionStatus $status): Collection;
    
    public function findActiveSessions(): Collection;
    
    public function save(WhatsAppSession $session): WhatsAppSession;
    
    public function delete(SessionId $sessionId): bool;
    
    public function updateStatus(SessionId $sessionId, SessionStatus $status): bool;
    
    public function findExpiredSessions(int $minutes): Collection;
    
    public function countByStatus(SessionStatus $status): int;
}
