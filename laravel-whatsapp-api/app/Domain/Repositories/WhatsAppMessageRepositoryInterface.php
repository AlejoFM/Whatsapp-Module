<?php

namespace App\Domain\Repositories;

use App\Domain\Entities\WhatsAppMessage;
use App\Domain\ValueObjects\MessageId;
use App\Domain\ValueObjects\ConversationId;
use App\Domain\ValueObjects\SessionId;
use App\Domain\ValueObjects\MessageDirection;
use Illuminate\Support\Collection;

interface WhatsAppMessageRepositoryInterface
{
    public function findById(MessageId $messageId): ?WhatsAppMessage;
    
    public function findByConversationId(ConversationId $conversationId, int $limit = 50, int $offset = 0): Collection;
    
    public function findBySessionId(SessionId $sessionId, int $limit = 100, int $offset = 0): Collection;
    
    public function findUnreadMessages(SessionId $sessionId): Collection;
    
    public function findByDirection(MessageDirection $direction, SessionId $sessionId): Collection;
    
    public function save(WhatsAppMessage $message): WhatsAppMessage;
    
    public function delete(MessageId $messageId): bool;
    
    public function markAsRead(MessageId $messageId): bool;
    
    public function countByConversation(ConversationId $conversationId): int;
    
    public function countUnreadBySession(SessionId $sessionId): int;
    
    public function findRecentMessages(SessionId $sessionId, int $hours = 24): Collection;
}
