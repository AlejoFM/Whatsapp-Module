<?php

namespace App\Domain\Repositories;

use App\Domain\Entities\WhatsAppConversation;
use App\Domain\ValueObjects\ConversationId;
use App\Domain\ValueObjects\SessionId;
use App\Domain\ValueObjects\PhoneNumber;
use Illuminate\Support\Collection;

interface WhatsAppConversationRepositoryInterface
{
    public function findById(ConversationId $conversationId): ?WhatsAppConversation;
    
    public function findBySessionId(SessionId $sessionId): Collection;
    
    public function findByContactPhone(PhoneNumber $phoneNumber): Collection;
    
    public function findActiveConversations(SessionId $sessionId): Collection;
    
    public function findArchivedConversations(SessionId $sessionId): Collection;
    
    public function save(WhatsAppConversation $conversation): WhatsAppConversation;
    
    public function delete(ConversationId $conversationId): bool;
    
    public function updateLastMessage(ConversationId $conversationId): bool;
    
    public function incrementUnreadCount(ConversationId $conversationId): bool;
    
    public function resetUnreadCount(ConversationId $conversationId): bool;
    
    public function archive(ConversationId $conversationId): bool;
    
    public function unarchive(ConversationId $conversationId): bool;
}
