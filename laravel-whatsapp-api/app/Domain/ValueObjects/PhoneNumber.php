<?php

namespace App\Domain\ValueObjects;

use App\Domain\Exceptions\InvalidPhoneNumberException;

class PhoneNumber
{
    private string $value;

    public function __construct(string $phoneNumber)
    {
        $this->validate($phoneNumber);
        $this->value = $this->normalize($phoneNumber);
    }

    private function validate(string $phoneNumber): void
    {
        if (empty($phoneNumber)) {
            throw new InvalidPhoneNumberException('El número de teléfono no puede estar vacío');
        }

        // Validación básica para números de teléfono internacionales
        if (!preg_match('/^\+?[1-9]\d{1,14}$/', $phoneNumber)) {
            throw new InvalidPhoneNumberException('El número de teléfono no tiene un formato válido');
        }
    }

    private function normalize(string $phoneNumber): string
    {
        // Asegurar que comience con +
        if (!str_starts_with($phoneNumber, '+')) {
            $phoneNumber = '+' . $phoneNumber;
        }

        return $phoneNumber;
    }

    public function getValue(): string
    {
        return $this->value;
    }

    public function __toString(): string
    {
        return $this->value;
    }

    public function equals(PhoneNumber $other): bool
    {
        return $this->value === $other->value;
    }
}
