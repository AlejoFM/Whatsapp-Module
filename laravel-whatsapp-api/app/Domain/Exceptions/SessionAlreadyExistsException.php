<?php

namespace App\Domain\Exceptions;

use Exception;

class SessionAlreadyExistsException extends Exception
{
    public function __construct(string $message = "La sesión ya existe", int $code = 0, ?Exception $previous = null)
    {
        parent::__construct($message, $code, $previous);
    }
}
