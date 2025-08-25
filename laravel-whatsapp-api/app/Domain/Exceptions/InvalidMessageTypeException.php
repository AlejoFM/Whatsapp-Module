<?php

namespace App\Domain\Exceptions;

use Exception;

class InvalidMessageTypeException extends Exception
{
    public function __construct(string $message = "Tipo de mensaje inválido", int $code = 0, ?Exception $previous = null)
    {
        parent::__construct($message, $code, $previous);
    }
}
