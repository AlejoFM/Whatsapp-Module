<?php

namespace App\Domain\ValueObjects;

use App\Domain\Exceptions\InvalidMessageTypeException;

class MessageType
{
    public const TEXT = 'text';
    public const IMAGE = 'image';
    public const AUDIO = 'audio';
    public const VIDEO = 'video';
    public const DOCUMENT = 'document';
    public const LOCATION = 'location';
    public const CONTACT = 'contact';
    public const STICKER = 'sticker';

    private string $value;

    public function __construct(string $type)
    {
        $this->validate($type);
        $this->value = $type;
    }

    private function validate(string $type): void
    {
        $validTypes = [
            self::TEXT,
            self::IMAGE,
            self::AUDIO,
            self::VIDEO,
            self::DOCUMENT,
            self::LOCATION,
            self::CONTACT,
            self::STICKER
        ];

        if (!in_array($type, $validTypes)) {
            throw new InvalidMessageTypeException("Tipo de mensaje inválido: {$type}");
        }
    }

    public function getValue(): string
    {
        return $this->value;
    }

    public function isText(): bool
    {
        return $this->value === self::TEXT;
    }

    public function isMedia(): bool
    {
        return in_array($this->value, [self::IMAGE, self::AUDIO, self::VIDEO, self::DOCUMENT]);
    }

    public function __toString(): string
    {
        return $this->value;
    }

    public function equals(MessageType $other): bool
    {
        return $this->value === $other->value;
    }
}
