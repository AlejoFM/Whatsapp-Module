<?php

namespace App\Domain\Exceptions;

use Exception;

class InvalidMessageDirectionException extends Exception
{
    public function __construct(string $message = "Dirección de mensaje inválida", int $code = 0, ?Exception $previous = null)
    {
        parent::__construct($message, $code, $previous);
    }
}
