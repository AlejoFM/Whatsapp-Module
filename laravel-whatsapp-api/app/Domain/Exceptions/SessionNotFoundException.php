<?php

namespace App\Domain\Exceptions;

use Exception;

class SessionNotFoundException extends Exception
{
    public function __construct(string $message = "Sesión no encontrada", int $code = 0, ?Exception $previous = null)
    {
        parent::__construct($message, $code, $previous);
    }
}
