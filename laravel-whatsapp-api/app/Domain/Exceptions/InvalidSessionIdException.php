<?php

namespace App\Domain\Exceptions;

use Exception;

class InvalidSessionIdException extends Exception
{
    public function __construct(string $message = "ID de sesión inválido", int $code = 0, ?Exception $previous = null)
    {
        parent::__construct($message, $code, $previous);
    }
}
