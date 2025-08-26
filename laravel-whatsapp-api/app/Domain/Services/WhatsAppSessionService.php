<?php

namespace App\Domain\Services;

use App\Domain\Entities\WhatsAppSession;
use App\Domain\Repositories\WhatsAppSessionRepositoryInterface;
use App\Domain\ValueObjects\SessionId;
use App\Domain\ValueObjects\PhoneNumber;
use App\Domain\ValueObjects\SessionStatus;
use App\Domain\Exceptions\SessionNotFoundException;
use App\Domain\Exceptions\SessionAlreadyExistsException;
use Illuminate\Support\Collection;

class WhatsAppSessionService
{
    public function __construct(
        private WhatsAppSessionRepositoryInterface $sessionRepository
    ) {}

    public function createSession(PhoneNumber $phoneNumber): WhatsAppSession
    {
        // Verificar si ya existe una sesión para este número
        $existingSession = $this->sessionRepository->findByPhoneNumber($phoneNumber);
        if ($existingSession) {
            throw new SessionAlreadyExistsException("Ya existe una sesión para el número {$phoneNumber}");
        }

        $session = new WhatsAppSession([
            'phone_number' => $phoneNumber->getValue(),
            'status' => (new SessionStatus(SessionStatus::QR_READY))->getValue(),
            'is_active' => false
        ]);

        return $this->sessionRepository->save($session);
    }

    public function getSession(SessionId $sessionId): WhatsAppSession
    {
        $session = $this->sessionRepository->findById($sessionId);
        if (!$session) {
            throw new SessionNotFoundException("Sesión no encontrada con ID: {$sessionId}");
        }

        return $session;
    }

    public function updateSessionStatus(SessionId $sessionId, SessionStatus $newStatus): WhatsAppSession
    {
        $session = $this->getSession($sessionId);
        $session->changeStatus($newStatus);
        
        return $session;
    }

    public function activateSession(SessionId $sessionId): WhatsAppSession
    {
        $session = $this->getSession($sessionId);
        $session->activate();
        
        return $session;
    }

    public function deactivateSession(SessionId $sessionId): WhatsAppSession
    {
        $session = $this->getSession($sessionId);
        $session->deactivate();
        
        return $session;
    }

    public function getActiveSessions(): Collection
    {
        return $this->sessionRepository->findActiveSessions();
    }

    public function getSessionsByStatus(SessionStatus $status): Collection
    {
        return $this->sessionRepository->findByStatus($status);
    }

    public function deleteSession(SessionId $sessionId): bool
    {
        $session = $this->getSession($sessionId);
        return $this->sessionRepository->delete($sessionId);
    }

    public function cleanupExpiredSessions(int $minutes = 60): int
    {
        $expiredSessions = $this->sessionRepository->findExpiredSessions($minutes);
        $deletedCount = 0;

        foreach ($expiredSessions as $session) {
            if ($this->sessionRepository->delete($session->getSessionId())) {
                $deletedCount++;
            }
        }

        return $deletedCount;
    }

    public function getSessionStatistics(): array
    {
        return [
            'total' => $this->sessionRepository->countByStatus(new SessionStatus(SessionStatus::CONNECTED)) +
                      $this->sessionRepository->countByStatus(new SessionStatus(SessionStatus::CONNECTING)) +
                      $this->sessionRepository->countByStatus(new SessionStatus(SessionStatus::DISCONNECTED)),
            'connected' => $this->sessionRepository->countByStatus(new SessionStatus(SessionStatus::CONNECTED)),
            'connecting' => $this->sessionRepository->countByStatus(new SessionStatus(SessionStatus::CONNECTING)),
            'disconnected' => $this->sessionRepository->countByStatus(new SessionStatus(SessionStatus::DISCONNECTED)),
            'error' => $this->sessionRepository->countByStatus(new SessionStatus(SessionStatus::ERROR))
        ];
    }
}
