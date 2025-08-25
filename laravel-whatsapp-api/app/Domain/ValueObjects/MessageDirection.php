<?php

namespace App\Domain\ValueObjects;

use App\Domain\Exceptions\InvalidMessageDirectionException;

class MessageDirection
{
    public const INCOMING = 'incoming';
    public const OUTGOING = 'outgoing';

    private string $value;

    public function __construct(string $direction)
    {
        $this->validate($direction);
        $this->value = $direction;
    }

    private function validate(string $direction): void
    {
        $validDirections = [
            self::INCOMING,
            self::OUTGOING
        ];

        if (!in_array($direction, $validDirections)) {
            throw new InvalidMessageDirectionException("Dirección de mensaje inválida: {$direction}");
        }
    }

    public function getValue(): string
    {
        return $this->value;
    }

    public function isIncoming(): bool
    {
        return $this->value === self::INCOMING;
    }

    public function isOutgoing(): bool
    {
        return $this->value === self::OUTGOING;
    }

    public function __toString(): string
    {
        return $this->value;
    }

    public function equals(MessageDirection $other): bool
    {
        return $this->value === $other->value;
    }
}
