<?php

namespace App\Domain\ValueObjects;

use App\Domain\Exceptions\InvalidMessageIdException;

class MessageId
{
    private string $value;

    public function __construct(string $messageId)
    {
        $this->validate($messageId);
        $this->value = $messageId;
    }

    public static function generate(): self
    {
        return new self(uniqid('msg_', true));
    }

    private function validate(string $messageId): void
    {
        if (empty($messageId)) {
            throw new InvalidMessageIdException('El ID del mensaje no puede estar vacío');
        }

        if (strlen($messageId) < 3) {
            throw new InvalidMessageIdException('El ID del mensaje debe tener al menos 3 caracteres');
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

    public function equals(MessageId $other): bool
    {
        return $this->value === $other->value;
    }
}
