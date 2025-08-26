<?php

namespace App\Domain\Exceptions;

use Exception;

class InvalidSessionStatusException extends Exception
{
    public function __construct(string $message = "Estado de sesión inválido", int $code = 0, ?Exception $previous = null)
    {
        parent::__construct($message, $code, $previous);
    }
}
