<?php

namespace App\Domain\Exceptions;

use Exception;

class InvalidConversationIdException extends Exception
{
    public function __construct(string $message = "ID de conversación inválido", int $code = 0, ?Exception $previous = null)
    {
        parent::__construct($message, $code, $previous);
    }
}
