<?php

namespace App\Domain\ValueObjects;

use App\Domain\Exceptions\InvalidConversationIdException;

class ConversationId
{
    private string $value;

    public function __construct(string $conversationId)
    {
        $this->validate($conversationId);
        $this->value = $conversationId;
    }

    public static function generate(): self
    {
        return new self(uniqid('conv_', true));
    }

    private function validate(string $conversationId): void
    {
        if (empty($conversationId)) {
            throw new InvalidConversationIdException('El ID de conversación no puede estar vacío');
        }

        if (strlen($conversationId) < 3) {
            throw new InvalidConversationIdException('El ID de conversación debe tener al menos 3 caracteres');
        }
    }

    public function getValue(): string
    {
        return $this->value;
    }

    public function __toString(): string
    {
        return $this->value;
    }

    public function equals(ConversationId $other): bool
    {
        return $this->value === $other->value;
    }
}
