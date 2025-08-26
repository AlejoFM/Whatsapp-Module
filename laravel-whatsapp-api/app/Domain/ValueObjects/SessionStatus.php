<?php

namespace App\Domain\ValueObjects;

use App\Domain\Exceptions\InvalidSessionStatusException;

class SessionStatus
{
    public const CONNECTING = 'connecting';
    public const CONNECTED = 'connected';
    public const DISCONNECTED = 'disconnected';
    public const ERROR = 'error';
    public const QR_READY = 'qr_ready';

    private string $value;

    public function __construct(string $status)
    {
        $this->validate($status);
        $this->value = $status;
    }

    private function validate(string $status): void
    {
        $validStatuses = [
            self::CONNECTING,
            self::CONNECTED,
            self::DISCONNECTED,
            self::ERROR,
            self::QR_READY
        ];

        if (!in_array($status, $validStatuses)) {
            throw new InvalidSessionStatusException("Estado de sesión inválido: {$status}");
        }
    }

    public function getValue(): string
    {
        return $this->value;
    }

    public function isConnecting(): bool
    {
        return $this->value === self::CONNECTING;
    }

    public function isConnected(): bool
    {
        return $this->value === self::CONNECTED;
    }

    public function isDisconnected(): bool
    {
        return $this->value === self::DISCONNECTED;
    }

    public function isError(): bool
    {
        return $this->value === self::ERROR;
    }

    public function isQrReady(): bool
    {
        return $this->value === self::QR_READY;
    }

    public function __toString(): string
    {
        return $this->value;
    }

    public function equals(SessionStatus $other): bool
    {
        return $this->value === $other->value;
    }
}
