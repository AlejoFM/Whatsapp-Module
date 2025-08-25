<?php

namespace App\Domain\ValueObjects;

use App\Domain\Exceptions\InvalidSessionIdException;

class SessionId
{
    private string $value;

    public function __construct(string $sessionId)
    {
        $this->validate($sessionId);
        $this->value = $sessionId;
    }

    public static function generate(): self
    {
        return new self(uniqid('session_', true));
    }

    private function validate(string $sessionId): void
    {
        if (empty($sessionId)) {
            throw new InvalidSessionIdException('El ID de sesión no puede estar vacío');
        }

        if (strlen($sessionId) < 3) {
            throw new InvalidSessionIdException('El ID de sesión debe tener al menos 3 caracteres');
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

    public function equals(SessionId $other): bool
    {
        return $this->value === $other->value;
    }
}
